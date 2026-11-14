import {
  addDoc,doc,
runTransaction,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import { db } from "../services/firebase";

// Reference to the incidents collection in Firestore
const incidentsRef = collection(db, "incidents");

// Create a new emergency when user presses SOS
export async function createSOS(user, location) {
  if (!user?.uid) {
    throw new Error("User must be logged in.");
  }

  if (
    !Number.isFinite(location?.latitude) ||
    !Number.isFinite(location?.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("Valid device location is required.");
  }

  const docRef = await addDoc(incidentsRef, {
    userId: user.uid,
    userName: user.displayName || "JATAYU User",

    location: {
      latitude: location.latitude,
      longitude: location.longitude
    },

    status: "pending",
    responderId: null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

// Get user's emergency history in real time
export function subscribeToMySOS(userId, onData, onError) {
  const q = query(
    incidentsRef,
    where("userId", "==", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const emergencies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      emergencies.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) -
          (a.createdAt?.toMillis?.() || 0)
      );

      onData(emergencies);
    },
    onError
  );
}

function mapIncident(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

// Listen for SOS requests waiting for a responder
export function subscribeToPendingSOS(onData, onError) {
  const q = query(
    incidentsRef,
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map(mapIncident);
      onData(requests);
    },
    onError
  );
}

// Listen for incidents assigned to one responder
export function subscribeToResponderSOS(
  responderId,
  onData,
  onError
) {
  const q = query(
    incidentsRef,
    where("responderId", "==", responderId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map(mapIncident);
      onData(records);
    },
    onError
  );
}

// Accept one pending SOS atomically
export async function acceptSOS(incidentId, responderId) {
  if (!responderId) {
    throw new Error("Responder login required.");
  }

  const incidentRef = doc(db, "incidents", incidentId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(incidentRef);

    if (!snapshot.exists()) {
      throw new Error("Emergency not found.");
    }

    if (
      snapshot.data().status !== "pending" ||
      snapshot.data().responderId !== null
    ) {
      throw new Error(
        "This emergency has already been assigned."
      );
    }

    transaction.update(incidentRef, {
      status: "accepted",
      responderId,
      updatedAt: serverTimestamp()
    });
  });
}

// Update an incident assigned to the responder
export async function updateResponderSOS(
  incidentId,
  responderId,
  nextStatus
) {
  const transitions = {
    accepted: "en_route",
    en_route: "on_scene",
    on_scene: "resolved"
  };

  const incidentRef = doc(db, "incidents", incidentId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(incidentRef);

    if (!snapshot.exists()) {
      throw new Error("Emergency not found.");
    }

    const incident = snapshot.data();

    if (incident.responderId !== responderId) {
      throw new Error("This incident is not assigned to you.");
    }

    if (transitions[incident.status] !== nextStatus) {
      throw new Error("Invalid incident status change.");
    }

    transaction.update(incidentRef, {
      status: nextStatus,
      updatedAt: serverTimestamp()
    });
  });
}
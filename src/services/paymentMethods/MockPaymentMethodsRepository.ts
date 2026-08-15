/**
 * EdumentX — Mock Payment methods repository
 *
 * In-memory stand-in used when `EXPO_PUBLIC_USE_MOCK_DATA=true`.
 * Mirrors the Firebase repository's method contract exactly so the
 * UI layer is source-agnostic.
 */

import type {
  PaymentMethod,
  PaymentMethodsRepository,
  ProfileKind,
} from "./PaymentMethodsRepository";

// Per (uid, kind) list, keyed by method id.
const methodsByKey = new Map<string, Map<string, Omit<PaymentMethod, "id">>>();
const listenersByKey = new Map<string, Set<() => void>>();

function key(uid: string, kind: ProfileKind) {
  return `${kind}:${uid}`;
}

function emit(uid: string, kind: ProfileKind) {
  listenersByKey.get(key(uid, kind))?.forEach((l) => l());
}

export const MockPaymentMethodsRepository: PaymentMethodsRepository = {
  subscribePaymentMethods(uid, profileKind, onData) {
    const k = key(uid, profileKind);
    const map = methodsByKey.get(k) ?? new Map();
    methodsByKey.set(k, map);

    const emitFor = () => {
      const methods: PaymentMethod[] = [...map.entries()].map(
        ([id, entry]) => ({ id, ...entry }),
      );
      onData(methods);
    };

    let listeners = listenersByKey.get(k);
    if (!listeners) {
      listeners = new Set();
      listenersByKey.set(k, listeners);
    }
    listeners.add(emitFor);
    emitFor();

    return () => {
      listenersByKey.get(k)?.delete(emitFor);
    };
  },

  async savePaymentMethod(uid, profileKind, provider, identifier) {
    const k = key(uid, profileKind);
    const map = methodsByKey.get(k) ?? new Map();
    methodsByKey.set(k, map);

    if (profileKind === "student") {
      const methodId = `${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      map.set(methodId, {
        provider,
        identifier,
        addedAt: Date.now(),
      });
    } else {
      map.set("default", { provider, identifier, addedAt: Date.now() });
    }
    emit(uid, profileKind);
  },

  async removePaymentMethod(uid, profileKind, methodId) {
    const map = methodsByKey.get(key(uid, profileKind));
    if (!map) return;
    map.delete(methodId);
    emit(uid, profileKind);
  },
};

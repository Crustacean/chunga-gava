"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getFingerprintHash } from "@/lib/fingerprint";

interface ActiveVote {
  target_id: number;
  rating_type: string;
}

interface VotesCacheValue {
  /** Available almost immediately after mount - fingerprinting starts at app boot, not when a
   * card is first opened, so it's already computed (or computing) by the time anything needs it. */
  fingerprintHash: string | null;
  /** True once the initial bulk vote-status pre-fetch has settled (success or failure). */
  ready: boolean;
  /** Instant, synchronous, zero-network lookup - the anti-bias gate reads this directly instead
   * of round-tripping to the backend on every card open. */
  hasVoted: (ratingType: string, targetId: number) => boolean;
  /** Optimistically records a vote client-side the moment a submission succeeds, so the UI can
   * flip to the "voted" state with 0ms delay instead of waiting on a fresh verification round-trip. */
  markVoted: (ratingType: string, targetId: number) => void;
}

const VotesCacheContext = createContext<VotesCacheValue | null>(null);

function keyFor(ratingType: string, targetId: number): string {
  return `${ratingType}:${targetId}`;
}

export function VotesCacheProvider({ children }: { children: React.ReactNode }) {
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const votedRef = useRef<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Kick off fingerprinting (and the eager vote-status cache it feeds) the instant the app
    // boots, in parallel with everything else mounting, rather than waiting for a leader card
    // to be clicked first.
    getFingerprintHash().then((hash) => {
      if (cancelled) return;
      setFingerprintHash(hash);
      api
        .get<ActiveVote[]>(`/api/votes/mine?fingerprint_hash=${hash}`)
        .then((votes) => {
          if (cancelled) return;
          votedRef.current = new Set(votes.map((v) => keyFor(v.rating_type, v.target_id)));
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function hasVoted(ratingType: string, targetId: number): boolean {
    return votedRef.current.has(keyFor(ratingType, targetId));
  }

  function markVoted(ratingType: string, targetId: number): void {
    votedRef.current.add(keyFor(ratingType, targetId));
    // votedRef is a plain ref (not React state) so consumers can read it synchronously with no
    // re-render on the read path; bump a counter here purely to notify subscribed components
    // that a write happened, so they re-render and pick up the change.
    setVersion((v) => v + 1);
  }

  return (
    <VotesCacheContext.Provider value={{ fingerprintHash, ready, hasVoted, markVoted }}>
      {children}
    </VotesCacheContext.Provider>
  );
}

export function useVotesCache(): VotesCacheValue {
  const ctx = useContext(VotesCacheContext);
  if (!ctx) throw new Error("useVotesCache must be used within VotesCacheProvider");
  return ctx;
}

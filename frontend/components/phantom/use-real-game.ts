"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealCandidate = {
  action: string[];
  action_raw: number[];
  base_value: number;
  rank: number;
  source: string;
};

export type OpponentBeliefFeatures = {
  observer?: string;
  rocket_probability: number;
  bomb_probability: number;
  expected_bomb_count: number;
  control_strength: number;
  estimated_turns_to_finish: number;
};

export type CounterfactualCandidate = {
  action: string[];
  action_raw: number[];
  base_value: number;
  base_rank: number;
  selected_by_base: boolean;
  before: OpponentBeliefFeatures;
  after: OpponentBeliefFeatures;
  shift: Pick<OpponentBeliefFeatures, "rocket_probability" | "bomb_probability" | "control_strength" | "estimated_turns_to_finish">;
};

export type CognitiveCandidate = CounterfactualCandidate & {
  base_loss: number;
  concealment_gain: number;
  bait_potential: number;
  future_control_value: number;
  strategic_risk: number;
  cognitive_gain: number;
  final_score: number | null;
  allowed_by_safety_gate: boolean;
  veto_reason: string | null;
  selected: boolean;
};

export type OpponentProfile = {
  status: "learning" | "profile_active";
  games: number;
  actions: number;
  pass_rate: number;
  bomb_usage_rate: number;
  high_card_early_rate: number;
  initiative_aggression: number;
  control_card_conservatism: number;
  bait_modifier: number;
  current_game_actions?: number;
  learning_level?: number;
  learning_name?: string;
  learning_progress?: number;
  adaptation_strength?: number;
  learning_insight?: string;
  next_milestone?: string;
};

export type RealGameEvent = {
  type: "session_started" | "human_turn" | "invalid_action" | "turn_resolved" | "game_finished" | "bridge_error";
  schema: string;
  mode: "real";
  source: string;
  seed?: number;
  session_id?: string;
  playback?: "replay";
  turn?: number;
  human_actions_taken?: number;
  actor?: "landlord" | "landlord_up" | "landlord_down";
  action?: string[];
  legal_actions?: string[][];
  recommended_action?: string[];
  recommended_action_type?: string;
  is_pass?: boolean;
  action_type?: string;
  selected_base_value?: number;
  legal_action_count?: number;
  scored_action_count?: number;
  decision_latency_ms?: number;
  candidates?: RealCandidate[];
  winner?: "landlord" | "farmer" | null;
  cognitive_layer?: "active";
  action_reranking?: "active";
  action_source?: string;
  style_bait_modifier?: number;
  adaptation_strength?: number;
  adaptive_choices?: number;
  opponent_profile?: OpponentProfile;
  metrics?: {
    decisions: number;
    cognitive_overrides: number;
    cognitive_override_rate: number;
    base_value_retention: number;
    average_value_sacrifice: number;
    average_belief_shift: number;
    trap_activations: number;
    trap_successes: number;
    control_resources_induced: number;
    average_rollout_latency_ms: number;
    max_rollout_latency_ms: number;
  };
  hidden_hand_belief?: {
    status: "active";
    health: {
      source: string;
      num_particles: number;
      ess: number;
      invalid_rate: number;
      resample_count: number;
    };
    features: Record<string, {
      rank_presence: Record<string, number>;
      rocket_probability: number;
      bomb_probability: number;
      expected_control_cards: number;
    }>;
  };
  opponent_belief?: {
    status: "estimated";
    source: string;
    method: string;
    target: "landlord";
    confidence: number;
    evidence_actions: number;
    observers: Record<string, OpponentBeliefFeatures>;
    consensus: OpponentBeliefFeatures;
    actual_state: OpponentBeliefFeatures;
  };
  counterfactual_rollout?: null | {
    status: "simulated";
    source: string;
    target: "landlord";
    top_k: number;
    history_length: number;
    before: OpponentBeliefFeatures;
    candidates: CounterfactualCandidate[];
    latency_ms: number;
  };
  cognitive_decision?: null | {
    status: "selected" | "fallback";
    source: string;
    max_base_value_loss?: number;
    best_base_value: number;
    selected_action: string[];
    selected_action_raw: number[];
    selected_base_value: number;
    selected_final_score?: number;
    selected_base_loss?: number;
    base_value_retention: number;
    override: boolean;
    reason: string;
    hidden_strength_gap?: number;
    fallback?: boolean;
    message?: string;
    candidates: CognitiveCandidate[];
  };
  cognitive_state?: {
    source: string;
    state: string;
    cycle: number;
    response_count: number;
    timeline: Array<{ from: string; to: string; reason: string }>;
  };
  message?: string;
  state?: {
    phantom_hand: string[];
    remaining: Record<"landlord" | "landlord_up" | "landlord_down", number>;
    played_cards: Record<string, string[]>;
    landlord_cards: string[];
    active_player: string | null;
    bombs_played: number;
    multiplier: number;
    spring: boolean;
    score: {
      landlord: number;
      farmer_each: number;
    };
    last_move: string[];
    last_move_player: "landlord" | "landlord_up" | "landlord_down" | null;
    last_move_type: string;
    has_initiative: boolean;
    cards_accounted_for: number;
  };
};

export type BridgeStatus = "idle" | "connecting" | "live" | "finished" | "error";

export type GameEndpoint = "game" | "play" | "replay";

function randomDealSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
    return value || 1;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) & 0x7fffffff || 1;
}

export function useRealGame(enabled: boolean, endpoint: GameEndpoint = "game", replaySession = "showcase-20260911") {
  const [status, setStatus] = useState<BridgeStatus>("connecting");
  const [event, setEvent] = useState<RealGameEvent | null>(null);
  const [cycle, setCycle] = useState(0);
  const [seed, setSeed] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSeed(randomDealSeed()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!enabled || seed === null) return;

    let completed = false;
    let cancelled = false;
    let reconnectTimer: number | undefined;
    const query = endpoint === "replay"
      ? `session=${encodeURIComponent(replaySession)}&pace_ms=1600`
      : `seed=${seed}&pace_ms=${endpoint === "play" ? 1700 : 1850}${endpoint === "game" ? "&wait_for_start=true" : ""}`;
    const socket = new WebSocket(`ws://127.0.0.1:8765/ws/${endpoint}?${query}`);
    socketRef.current = socket;
    socket.onopen = () => setStatus("connecting");
    socket.onmessage = (message) => {
      let next: RealGameEvent;
      try {
        next = JSON.parse(message.data) as RealGameEvent;
      } catch {
        completed = true;
        socket.close(1008, "Invalid JSON payload");
        setStatus("error");
        return;
      }
      if (next.schema !== "phantom.game.v1" || next.mode !== "real" || !next.source) {
        completed = true;
        socket.close(1008, "Untrusted bridge payload");
        setStatus("error");
        return;
      }
      retryRef.current = 0;
      setEvent(next);
      if (next.type === "bridge_error") {
        completed = true;
        setStatus("error");
      }
      else if (next.type === "game_finished") {
        completed = true;
        setStatus("finished");
      } else setStatus("live");
    };
    socket.onerror = () => setStatus("error");
    socket.onclose = () => {
      if (!completed && !cancelled) {
        if (retryRef.current >= 4) {
          setStatus("error");
          return;
        }
        const delay = 700 * (2 ** retryRef.current);
        retryRef.current += 1;
        setStatus("connecting");
        reconnectTimer = window.setTimeout(() => setCycle((value) => value + 1), delay);
      }
    };
    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current = null;
      socket.close();
    };
  }, [enabled, cycle, endpoint, replaySession, seed]);

  const startAutoPlay = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN || endpoint !== "game") return false;
    socket.send(JSON.stringify({ type: "start_autoplay" }));
    return true;
  }, [endpoint]);

  return {
    status: enabled ? status : "idle" as BridgeStatus,
    event: enabled ? event : null,
    seed: seed ?? 0,
    sendHumanAction: (action: string[]) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "human_action", action }));
        return true;
      }
      return false;
    },
    startAutoPlay,
    restart: () => {
      retryRef.current = 0;
      setStatus("connecting");
      setEvent(null);
      if (seed === null) setSeed(randomDealSeed());
      else setCycle((value) => value + 1);
    },
    newDeal: () => {
      retryRef.current = 0;
      setStatus("connecting");
      setEvent(null);
      setSeed(randomDealSeed());
    },
  };
}

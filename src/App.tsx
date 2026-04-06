import { useState, useCallback } from "react";
import type {
  AppPhase,
  GameConfig,
  Prices,
  Choices,
  RoundData,
  Allocation,
} from "@/lib/types";
import {
  initialPrices,
  computeNextPrices,
  getStepForRound,
  isEnvyFree,
  fixRounding,
} from "@/lib/algorithm";
import { Setup } from "@/components/Setup";
import { RoundView } from "@/components/RoundView";
import { ResultView } from "@/components/ResultView";

const MAX_ROUNDS = 15;

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Prices>([0, 0, 0]);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [allocation, setAllocation] = useState<Allocation | null>(null);

  const handleStart = useCallback((cfg: GameConfig) => {
    setConfig(cfg);
    const prices = initialPrices(cfg.totalRent);
    setCurrentPrices(prices);
    setRounds([]);
    setAllocation(null);
    setPhase("round");
  }, []);

  const handleChoices = useCallback(
    (choices: Choices) => {
      if (!config) return;

      const roundNum = rounds.length + 1;
      const envyFree = isEnvyFree(choices);

      const roundData: RoundData = {
        round: roundNum,
        prices: currentPrices,
        choices,
        isEnvyFree: envyFree,
      };

      const newRounds = [...rounds, roundData];
      setRounds(newRounds);

      if (envyFree || roundNum >= MAX_ROUNDS) {
        // Done! Create allocation
        const assignment = choices as [number, number, number];

        // If we hit max rounds without envy-free, use best available
        // assignment (the last choices, which might have conflicts)
        const finalPrices = fixRounding(currentPrices, config.totalRent);

        setAllocation({
          assignment,
          prices: finalPrices,
          rounds: newRounds,
        });
        setPhase("result");
      } else {
        // Compute next prices
        const step = getStepForRound(config.totalRent, roundNum);
        const next = computeNextPrices(
          currentPrices,
          choices,
          config.totalRent,
          step,
        );
        setCurrentPrices(fixRounding(next, config.totalRent));
      }
    },
    [config, currentPrices, rounds],
  );

  const handleRestart = useCallback(() => {
    setPhase("setup");
    setConfig(null);
    setRounds([]);
    setAllocation(null);
  }, []);

  switch (phase) {
    case "setup":
      return <Setup onStart={handleStart} />;
    case "round":
      return (
        <RoundView
          config={config!}
          prices={currentPrices}
          round={rounds.length + 1}
          totalRounds={MAX_ROUNDS}
          onSubmitChoices={handleChoices}
          onRestart={handleRestart}
        />
      );
    case "result":
      return (
        <ResultView
          config={config!}
          allocation={allocation!}
          onRestart={handleRestart}
        />
      );
  }
}

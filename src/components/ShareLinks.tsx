import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Link2, Users, ArrowRight } from "lucide-react";
import type { CreateGameResult } from "@/lib/multiplayer";
import { buildPlayerLink } from "@/lib/multiplayer";
import { PERSON_COLORS } from "@/lib/constants";

interface Props {
  game: CreateGameResult;
  onJoinAsHost: () => void;
}

export function ShareLinks({ game, onJoinAsHost }: Props) {
  const [copied, setCopied] = useState<number | null>(null);

  // Player 0 is the host — links for players 1 and 2
  const links = [1, 2].map((i) => ({
    playerIndex: i,
    name: game.playerNames[i],
    url: buildPlayerLink(game.gameId, game.tokens[i]),
  }));

  const copyLink = async (idx: number, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLink = async (name: string, url: string) => {
    if (navigator.share) {
      await navigator.share({
        title: "Fair Split — Join Rent Division",
        text: `Hey ${name}, join our rent split! Pick your preferred room:`,
        url,
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-4">
            <Users className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Share with roommates</h2>
          <p className="text-sm text-text-secondary">
            Send each person their link. They'll pick rooms on their own device.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {links.map(({ playerIndex, name, url }, i) => (
            <motion.div
              key={playerIndex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold">
                    {playerIndex + 1}
                  </div>
                  <span className={`font-semibold ${PERSON_COLORS[playerIndex]}`}>
                    {name}
                  </span>
                </div>
                <Link2 className="w-4 h-4 text-text-muted" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-bg rounded-lg px-3 py-2 text-xs text-text-muted truncate font-mono">
                  {url}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copyLink(playerIndex, url)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface-2 hover:bg-surface-3 rounded-lg py-2 text-sm transition-colors"
                >
                  {copied === playerIndex ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
                {typeof navigator.share === "function" && (
                  <button
                    onClick={() => shareLink(name, url)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-surface-2 hover:bg-surface-3 rounded-lg py-2 text-sm transition-colors"
                  >
                    Share
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Host join button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={onJoinAsHost}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg py-3 transition-colors"
          >
            I'm ready — join as {game.playerNames[0]}
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-text-muted text-center mt-2">
            You'll make your own choices once everyone's connected
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

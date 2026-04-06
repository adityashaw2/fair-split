# Fair Split ⚖️

Envy-free rent division using **Su's Rental Harmony Theorem** (1999).

Split rent between 3 roommates with a mathematically guaranteed fair allocation — nobody will want to swap rooms.

## How It Works

Based on Francis Su's proof using **Sperner's lemma** from combinatorial topology:

1. The algorithm proposes room prices that sum to total rent
2. Each person picks their preferred room at those prices
3. If everyone picks a different room → **envy-free, done!**
4. If not → contested rooms get more expensive, unpopular rooms get cheaper
5. Repeat — convergence is mathematically guaranteed

## Features

- 🎯 **Envy-free**: No one would rather have someone else's room at their price
- 💰 **Income weighting**: Optional adjustment so rent burden is proportional to income
- 📐 **Simplex visualization**: Watch the algorithm converge on the rent triangle
- 📱 **Mobile-first**: Works on any device
- 🔒 **Privacy**: No data leaves your browser

## Stack

React 19 + Vite + Tailwind CSS 4 + Framer Motion

## Run Locally

```bash
npm install
npm run dev
```

## References

- Su, Francis Edward. "Rental Harmony: Sperner's Lemma in Fair Division." *American Mathematical Monthly* 106.10 (1999): 930-942.
- [NYT Rent Division Calculator](https://www.nytimes.com/interactive/2014/science/rent-division-calculator.html)

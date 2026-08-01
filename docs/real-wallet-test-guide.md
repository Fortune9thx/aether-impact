# Real-Wallet End-to-End Test Guide

Live site: https://aether-impact.vercel.app
Network: GenLayer Bradbury testnet (your wallet will prompt to add/switch to it automatically on connect)
Wallet: any EVM wallet (OKX Wallet, Rabby, MetaMask, etc.) with some Bradbury GEN for gas

If Bradbury is congested, steps may take longer than usual or need a retry — that's the network, not the app. Retry the specific step, don't restart from scratch.

## 1. Connect Wallet

- Click **Connect Wallet** (top right).
- If you have more than one wallet extension installed, you should see a picker showing each one by name/icon — pick the one you want.
- Your wallet should prompt to switch/add the Bradbury network. Approve it.
- **Watch for:** the button should turn into your truncated address (e.g. `0x1234...abcd`). No "MetaMask is not installed" error should appear regardless of which wallet you used.

## 2. Create Round

- Go to **New Round**.
- Fill in a title, description, and evaluation criteria (character counters should update live under each field).
- Adjust the two dimension sliders — watch the thin bar above them resize live as you drag.
- Make sure the weights show **100% total** in accent green (it's red until they sum to 100).
- Click **Create Round**, approve the transaction in your wallet.
- **Watch for:** button shows "Creating..." while pending, then redirects to `/rounds` and your new round appears in the list. You are now that round's admin.

## 3. Submit Project

- Go to **Submit Project**, select your round.
- Fill in project name, description, claimed impact, and at least one evidence link (must be `http://` or `https://`).
- Submit, approve in wallet.
- **Watch for:** redirects to the round page; project count should increment.

## 4. Evaluate Project

- Open the round → click through to your submitted project.
- Click **Trigger Evaluation**.
- This is the slow step — it's a real LLM call across GenLayer validators, can take 30s–2min+.
- **Watch for:**
  - Button text may briefly show **"Appeal in progress..."** instead of the generic "Evaluating..." text if the transaction enters an appeal round — that's new, worth confirming it appears correctly if it happens (it's timing-dependent, may not trigger every time).
  - Once done, the **Evaluation Result page** should render: "EVALUATION" label, your project name in large serif, metadata line (round · date · status), a **large serif score number that counts up from 0** with "Confidence X%" underneath, dimension rows each showing **weight% and score/100**, a "Reasoning" section in serif body text, "Cited Evidence" and "Submitted Evidence" sections below it.
  - **This count-up animation is the one thing I could never verify myself** (my testing tool can't render animations) — confirm with your own eyes that it smoothly counts up rather than just appearing instantly or staying at 0.

## 5. Challenge (optional but preferred)

- From the evaluation page, click **Challenge Evaluation**.
- Add new evidence, submit, approve in wallet.
- **Watch for:** redirects back to the evaluation page, a red "Re-evaluated after challenge — by 0x..." badge appears, score/reasoning update, and your new evidence appears in "Submitted Evidence" tagged as a challenge with your address.

## 6. Compute Distribution

- Go back to the round page (you must be admin — you are, since you created it).
- Close the round first ("Close round to submissions").
- Enter a pool amount (e.g. `0.1`) and click **Compute distribution**.
- **Watch for:** Rankings page should now show a "Distribution" section listing your project with its calculated payout.

## 7. Mark Paid

- On the Rankings page or the project's evaluation page, as admin, click **Mark Paid** next to your project's payout.
- **Watch for:** it should switch to a "Paid" label. Note this does **not** actually send GEN — that's the known, documented Bradbury limitation. This step only records that you (the admin) settled it manually off-chain.

## What to report back

For each step: did it work as described, and anything that looked broken, confusing, or different from this guide (especially step 4's count-up animation and step 1's wallet picker).

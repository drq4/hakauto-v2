# Make the HAK AUTO fly-through on higgsfield.ai (trial credits)

**Budget:** 100 trial credits. Plan: 1 image (~3 credits) + 3 video clips of 10 s at 480p (~30 each) = **~93 credits**.

**Check the price on each Generate button before clicking.**
- A 10 s 480p clip should show about **30**. If it shows much more, stop and tell me.
- If a video shows **70**, the resolution is set to 720p. Switch it to 480p.

Save every downloaded file into `production/clips/` with the exact name given in each step.

---

## Step 1 — Opening image (GPT Image 2.5, ~3 credits)

1. Go to higgsfield.ai → **Image** → choose **GPT Image 2.5**.
2. Upload `01-upload-this-garage-photo.jpg` as the reference image.
3. Paste the prompt from `02-prompt-start-image.txt`.
4. Settings: aspect ratio **16:9**, resolution **2K**, quality **High**. Generate **1** image.
5. Check: is it the same building, with both glass doors open?
6. Download it and save it as `production/clips/start.png`.

> If the result isn't faithful to the building, stop and tell me. Don't spend more credits on it: we can use the original photo as the start frame instead (doors closed, but free).

## Step 2 — Clip A: entrance + showroom (Seedance 2.5, ~30 credits)

1. Go to **Video** → choose **Seedance 2.5**, mode **image-to-video** (may be called "omni reference" or "start frame").
2. Start frame / first image: `start.png` from step 1.
3. Paste the prompt from `03-prompt-clip-a.txt`.
4. Settings: duration **10 s**, resolution **480p**, aspect **16:9**, **audio off**.
5. Decline any suggested preset or "enhance prompt" option. Use the prompt as written.
6. Download it and save it as `production/clips/clip-a.mp4`.

**Tell me when clip A is saved.** I'll check it frame by frame before you spend credits on clip B.

## Step 3 — Clip B: reception + workshop (~30 credits)

1. Open clip A in Higgsfield and choose **Extend** (forward). It may be called "video extension" or "continue".
2. Paste the prompt from `04-prompt-clip-b.txt`. Settings: **10 s**, **480p**, audio off.
3. Download it and save it as `production/clips/clip-b.mp4`.

> **If there's no Extend option:** tell me. I'll extract clip A's last frame into `production/clips/clip-a-last.png`, and you then make clip B as image-to-video with that image as the start frame.

## Step 4 — Clip C: exit, 180° turn, aerial reveal (~30 credits)

Same as step 3, but extend **clip B** using `05-prompt-clip-c.txt`. Save it as `production/clips/clip-c.mp4`.

---

When all three are saved, I'll stitch them into one continuous flight and export the scroll frames. The site then switches from the placeholder to your real footage.

**Note:** 480p is soft on a large desktop screen. It's a proof of the full tour. With the paid plan, re-running the same prompts at 720p is a one-command job.

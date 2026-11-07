# Mise presentation UI · issue #34

The scan hero uses the pitch deck's serrated ticket edge, one egg case and one oat-milk case. Content follows the selected English, Spanish or Chinese review language. Removed the header badges, introductory paragraph, explanatory footer and repeated demo copy.

Two-pass OCR and pre-read cropping are still used. A photo now opens one editable ingredient list, including any lines returned by just one reader. The original remains available in photo/settings. Add, edit or remove lines, then explicitly add the reviewed list to the ZIP cart. Individual engine outputs and confidence decisions are internal. Long ingredient lists, cart rows and receipts are bounded independently of the total and action button.

Verified production build and Chromium at 390px and 1280px. Fixture disagreements yielded one 18-item list; edits, add/remove, localized tickets, cart scrolling and no horizontal overflow passed. Live cropped Chinese fixture produced a USD 78 simulated receipt. The build check also uncovered two pre-existing TypeScript errors: added the Chinese price-at-store label and limited the pepper teaspoon query to the supported unit.

Integrated main's live cart search into the presentation flow. Submitting the edited list now shows per-line search progress before displaying the compact cart. The production build and all 57 backend tests passed. Chromium fixtures at 390px and 1280px covered an 18-line cart and recovery of edited text after a search failure. The production search and approval endpoints returned a simulated USD 78 receipt for one case each of eggs and oat milk in Chinese at ZIP 10011.

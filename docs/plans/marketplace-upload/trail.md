# Thinking trail: Hand upload

## Starting framing

The launch plan published automatically through Entra ID with a managed identity. Marco started the Azure setup.

## Turns

**No card, no Azure.** The Azure free account's sign-up asked for a credit card, which Marco doesn't have. Three options were put to him:
- a debit card with a Visa or Mastercard logo;
- uploading the verified VSIX by hand;
- a global PAT as a stopgap, which expires on 1 December and is a secret.

Marco looked at his publisher page and went for the hand upload. → 0001

**A browser agent, considered and dropped.** Marco asked whether a skill could do the upload with an agent and Playwright, or whether there was a way around Azure for automatic deployment. Answer: not today; trusted publishing is the way, and it's close. A browser agent would hold Marco's Microsoft session, so a skill prepares and verifies, and Marco uploads. → 0002, 0006

**Private window.** Marco asked for the link in chat instead of opening his browser, because his work account interferes; a private window is fine if the agent can open one. → 0003

## Rejected without a decision file

- A debit card for Azure: not pursued once the hand upload was chosen.

## Open / to re-check

- When trusted publishing goes live, and how we'll notice.

# LUNA Text Messaging — iPhone Shortcuts Setup (Emma test)

This connects one contact (Emma) to LUNA's Text Messaging feature. When Emma texts you, your phone
silently forwards the message to LUNA, which analyzes it and drafts 3 replies for you to review at
`mylunaguide.online/chat/texts`.

## 1. Set the shared secret

The webhook is public on the internet, so it's protected by a shared secret header. Pick any long
random string (e.g. generate one at randomkeygen.com) and set it in **two** places — they must match
exactly:

- **Vercel**: Project → Settings → Environment Variables → add `LUNA_INCOMING_SECRET` = `<your secret>`
  → redeploy so it takes effect.
- **The Shortcut itself** (step 4 below) — you'll paste the same value into a header.

Keep this secret private — anyone who has it could POST fake messages to your endpoint.

## 2. Create the automation

1. Open the **Shortcuts** app → **Automation** tab → tap **+** (top right) → **Create Personal Automation**.
2. Choose **Message** as the trigger.
3. Tap **Choose** under "Message from" and select **Emma**'s contact.
4. You don't need to add a content condition for this first test — the contact filter above already
   scopes it to Emma. (If you later want to expand this to more contacts filtered by keyword, that's
   where an `If` action would go.)
5. Tap **Next**.

## 3. Add the "Get Contents of URL" action

1. Search for and add the **Get Contents of URL** action.
2. **URL**: `https://mylunaguide.online/api/luna/messages/incoming`
3. Tap **Method** → **POST**.
4. Tap **Headers** → add two:
   - `Content-Type` → `application/json`
   - `x-luna-secret` → `<the secret you set in step 1>`
5. Tap **Request Body** → **JSON**, and add these fields:
   - `senderName` → text `Emma` (or tap the field and insert the trigger's sender name variable if
     your iOS version exposes one)
   - `senderIdentifier` → insert the trigger's sender phone/handle variable (or type Emma's number)
   - `message` → tap the field, insert the **Shortcut Input** variable (this is the message text)
   - `receivedAt` → add a **Format Date** action *before* this one, set to **Current Date**, format
     **ISO 8601**, then insert that formatted date here
   - `conversationId` → text `emma-main-thread` (a fixed value is fine for this single-contact test)
   - `source` → text `imessage`

## 4. Run silently

In the automation's settings (the toggle near the top), turn **off** "Ask Before Running" so it fires
in the background without a confirmation prompt every time Emma texts you.

## 5. Test it

1. Have Emma send you a real text (or send yourself a test message that matches the trigger).
2. Open `mylunaguide.online/chat/texts` on your phone — within a few seconds you should see the new
   message banner, LUNA's analysis, and 3 drafts.

## Troubleshooting

- **401 Unauthorized**: the `x-luna-secret` header value doesn't match `LUNA_INCOMING_SECRET` in
  Vercel — double check both, and make sure you redeployed after setting the env var.
- **400 Bad Request**: one of the JSON fields came through empty — re-check the variable mapping in
  step 3, especially `message` and `receivedAt`.
- **500 / "Endpoint not configured"**: `LUNA_INCOMING_SECRET` isn't set in Vercel at all yet.
- **Nothing shows up on `/chat/texts` but the Shortcut says it ran**: open the page and check for a
  red error card — if analysis failed, the message is still saved and you can tap **Retry analysis**.
- To see server-side errors: Vercel dashboard → your project → **Deployments** → latest deployment →
  **Functions** → find `api/luna/messages/incoming` → view logs.

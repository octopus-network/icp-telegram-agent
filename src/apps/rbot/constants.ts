const BOT_USERNAME = process.env.RBOT_BOT_USERNAME

export const RBOT_START_IN_GROUP_MESSAGE = 'Hi, I am RBot, your crypto wallet & red envelope assistant. I must stay in this group to send red envelopes that every group member can claim. Want to create a red envelope? or access your crypto wallet? I can help you do these in private chat.'

export const RBOT_START_IN_GROUP_KEYBOARD = {
  inline_keyboard: [
    [
      {
        text: "Go to private chat",
        url: `https://t.me/${BOT_USERNAME}?start=1`
      }
    ]
  ]
}

export const RBOT_START_IN_PRIVATE_MESSAGE = `
Hi, I am RBot, your crypto wallet & red envelope assistant.

I have set up an 90% fully-functional cryptocurrency wallet for you. Only you can accesss this wallet via Telegram.

How to create and send a red envelope in a group?

== STEP 1. Deposit cryptocurrencies to your wallet address.

== STEP 2. Create a red envelope.
/create [Symbol] [Amout] [Count]
<i>e.g., /create BTC 0.1 5</i>
<u>It must be done in this private chat.</u>

== SETP 3. Add me to your group.

== STEP 4. Ask me to show the red envelope that your created.
/redenvelope [RedEnvelopeID]
<i>e.g., /redenvelope 1003</i>
<u>It must be done in your group chat.</u>
`

export const RBOT_START_IN_PRIVATE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "Address", callback_data: "showAddress" },
      { text: "Balance", callback_data: "showBalance" },
      { text: "Transfer", callback_data: "showHowToTransfer" }
    ],
    [
      { text: "Create a red envelope", callback_data: "showHowToCreateARedEnvelope" }
    ],
    [
      { text: "Red envelopes that you created", callback_data: "showRedEnvelopesYouCreated" }
    ],
    [
      { text: "Command list", callback_data: "showCommandList" }
    ]
  ]
}

export const RBOT_HELP_MESSAGE = `
👇 Commands available in private chat

/start
Show welcome message and dashboard.

/address
Show your wallet address.

/balance
Show your wallet balance.

/transfer [Symbol] [Amount] [Address]
Transfer cryptocurrencies from your wallet to any address.
<i>e.g., /transfer BTC 0.1 XXXXXXXXXXXXXXXX</i>

/create [Symbol] [Amout] [Count]
Create an red envelope.
<i>e.g., /create BTC 0.1 5</i>

/icreated
Show all red envelopes that you created.

/help
Show full command list.

👇 Commands available in group chat

/start
Show welcome message.

/redenvelope [RedEnvelopeID]
Show a red envelope in a group.
<i>e.g., /redenvelope XXXXXX</i>
`

export const RBOT_HOW_TO_TRANSFER_MESSAGE = 'Type the follwing command to transfer:\n\n/transfer [Symbol] [Amount] [Address]\ne.g., /transfer BTC 0.3 xxxxxxxxxxxxxxxx'

export const RBOT_HOW_TO_CREATE_RED_ENVELOPE = 'Type the follwing command to create a red envelope:\n\n/create [Symbol] [Amount] [Count]\ne.g., /create BTC 0.3 7'

export const RBOT_REDENVELOPE_KEYBOARD = (rid: bigint) => {
  return {
    inline_keyboard: [
      [
        { text: "Claim", callback_data: `claimRedEnvelope_${rid.toString()}` },
      ],
      [
        { text: "View log", callback_data: "showRedEnvelopeLog" }
      ],
      [
        { text: "Open your wallet", url: `https://t.me/${BOT_USERNAME}?start=1` }
      ]
    ]
  }
}

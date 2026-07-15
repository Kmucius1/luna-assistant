import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

// Sandbox only for now — she just added PLAID_SANDBOX_SECRET. When she's
// ready for real accounts, add PLAID_SECRET (production) and switch
// PlaidEnvironments.sandbox -> PlaidEnvironments.production below.
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SANDBOX_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

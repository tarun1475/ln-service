const {test} = require('tap');

const createInvoice = require('./../../createInvoice');
const decodePaymentRequest = require('./../../decodePaymentRequest');
const {delay} = require('./../macros');
const getWalletInfo = require('./../../getWalletInfo');
const {spawnLnd} = require('./../macros');

const description = 'description';
const expiresAt = new Date().toISOString();
const secret = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
const secretHash = '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925';
const tokens = 4194304;

const tests = [
  {
    description: "Test invoice",
    expected: {
      description: 'Read: Global Cryptocurrency Regulation',
      destination: '02212d3ec887188b284dbb7b2e6eb40629a6e14fb049673f22d2a0aa05f902090e',
      expires_at: '2018-07-03T03:32:54.000Z',
      id: '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
      is_expired: false,
      mtokens: '150000',
      tokens: 150,
    },
  },
];

tests.forEach(({description, expected}) => {
  return test(description, async ({deepIs, end, equal}) => {
    const {kill, lnd} = await spawnLnd({});

    const {request} = await createInvoice({
      lnd,
      description: expected.description,
      secret: '0000000000000000000000000000000000000000000000000000000000000000',
      tokens: expected.tokens,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });

    const decoded = await decodePaymentRequest({lnd, request});

    equal(decoded.chain_addresses, expected.chain_addresses, 'Chain address');
    equal(decoded.cltv_delta, expected.cltv_delta, 'Decode cltv delta');
    equal(!!decoded.created_at, true, 'Created at date');
    equal(decoded.description, expected.description, 'Decode description');
    equal(decoded.description_hash, expected.description_hash, 'Desc hash');
    equal(decoded.destination, (await getWalletInfo({lnd})).public_key, 'Pk');
    equal(decoded.id, expected.id, 'Decoded payment hash');
    equal(decoded.is_expired, expected.is_expired, 'Check expiration status');
    equal(decoded.tokens, expected.tokens, 'Decode tokens amount');

    kill();

    await delay(3000);

    return end();
  });
});

// decodePaymentRequest should result in a decoded payment request
test(`Decode a payment request`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const {request} = await createInvoice({
    description,
    lnd,
    secret,
    tokens,
    expires_at: expiresAt,
  });

  const decoded = await decodePaymentRequest({lnd, request});

  equal(decoded.chain_address, undefined, 'No fallback chain address');
  equal(decoded.description, 'description', 'Invoice encodes description');
  equal(decoded.id, secretHash, 'Payment hash matches preimage');
  equal(decoded.tokens, tokens, 'Request made for specified tokens amount');
  equal(decoded.type, 'payment_request', 'Row type is payment request');

  kill();

  await delay(3000);

  return end();
});


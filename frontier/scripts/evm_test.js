// Import the API, Keyring and some utility functions
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

const alice = '0xd43593c715fdd31c61141abd04a99fd6822c8558';
const bob = '0x8eaf04151687736326c9fea17e25fc5287613693';

// calculated from https://github.com/paritytech/frontier/blob/master/template/utils/README.md#--erc20-slot-slot-address
// node ./utils --erc20-slot 0 0xd43593c715fdd31c61141abd04a99fd6822c8558
const alice_storage_slot = '0x045c0350b9cf0df39c4b40400c965118df2dca5ce0fbcf0de4aafc099aea4a14';
// node ./utils --erc20-slot 0 0x8eaf04151687736326c9fea17e25fc5287613693
const bob_storage_slot = '0xe15f03c03b19c474c700f0ded08fa4d431a189d91588b86c3ef774970f504892';

const alice_balance_init = '340282366920938463463374607431768211455';

const smart_contract_address = '0x8a50db1e0f9452cfd91be8dc004ceb11cb08832f';

// from https://github.com/paritytech/frontier/blob/master/template/examples/contract-erc20/truffle/contracts/MyToken.json#L259
const erc20_bytecode = '0x608060405234801561001057600080fd5b50610041337fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff61004660201b60201c565b610291565b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614156100e9576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601f8152602001807f45524332303a206d696e7420746f20746865207a65726f20616464726573730081525060200191505060405180910390fd5b6101028160025461020960201b610c7c1790919060201c565b60028190555061015d816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461020960201b610c7c1790919060201c565b6000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b600080828401905083811015610287576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601b8152602001807f536166654d6174683a206164646974696f6e206f766572666c6f77000000000081525060200191505060405180910390fd5b8091505092915050565b610e3a806102a06000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c806370a082311161005b57806370a08231146101fd578063a457c2d714610255578063a9059cbb146102bb578063dd62ed3e1461032157610088565b8063095ea7b31461008d57806318160ddd146100f357806323b872dd146101115780633950935114610197575b600080fd5b6100d9600480360360408110156100a357600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610399565b604051808215151515815260200191505060405180910390f35b6100fb6103b7565b6040518082815260200191505060405180910390f35b61017d6004803603606081101561012757600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506103c1565b604051808215151515815260200191505060405180910390f35b6101e3600480360360408110156101ad57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061049a565b604051808215151515815260200191505060405180910390f35b61023f6004803603602081101561021357600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505061054d565b6040518082815260200191505060405180910390f35b6102a16004803603604081101561026b57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610595565b604051808215151515815260200191505060405180910390f35b610307600480360360408110156102d157600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610662565b604051808215151515815260200191505060405180910390f35b6103836004803603604081101561033757600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610680565b6040518082815260200191505060405180910390f35b60006103ad6103a6610707565b848461070f565b6001905092915050565b6000600254905090565b60006103ce848484610906565b61048f846103da610707565b61048a85604051806060016040528060288152602001610d7060289139600160008b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000610440610707565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610bbc9092919063ffffffff16565b61070f565b600190509392505050565b60006105436104a7610707565b8461053e85600160006104b8610707565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008973ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610c7c90919063ffffffff16565b61070f565b6001905092915050565b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60006106586105a2610707565b8461065385604051806060016040528060258152602001610de160259139600160006105cc610707565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008a73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610bbc9092919063ffffffff16565b61070f565b6001905092915050565b600061067661066f610707565b8484610906565b6001905092915050565b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b600033905090565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415610795576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526024815260200180610dbd6024913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16141561081b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180610d286022913960400191505060405180910390fd5b80600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925836040518082815260200191505060405180910390a3505050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16141561098c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526025815260200180610d986025913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415610a12576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526023815260200180610d056023913960400191505060405180910390fd5b610a7d81604051806060016040528060268152602001610d4a602691396000808773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610bbc9092919063ffffffff16565b6000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610b10816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610c7c90919063ffffffff16565b6000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a3505050565b6000838311158290610c69576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b83811015610c2e578082015181840152602081019050610c13565b50505050905090810190601f168015610c5b5780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b5060008385039050809150509392505050565b600080828401905083811015610cfa576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601b8152602001807f536166654d6174683a206164646974696f6e206f766572666c6f77000000000081525060200191505060405180910390fd5b809150509291505056fe45524332303a207472616e7366657220746f20746865207a65726f206164647265737345524332303a20617070726f766520746f20746865207a65726f206164647265737345524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e636545524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e636545524332303a207472616e736665722066726f6d20746865207a65726f206164647265737345524332303a20617070726f76652066726f6d20746865207a65726f206164647265737345524332303a2064656372656173656420616c6c6f77616e63652062656c6f77207a65726fa265627a7a72315820c7a5ffabf642bda14700b2de42f8c57b36621af020441df825de45fd2b3e1c5c64736f6c63430005100032';


async function getApi() {
    const wsProvider = new WsProvider("ws://127.0.0.1:9944");
    const api = await ApiPromise.create({
	provider: wsProvider,
	types: {
            "Balance": "u128",
            "MemberId": "u64",
            "Timestamp": "Moment",
            "BlockNumber": "u32",
            "IpV4": "Vec<u8>",
            "CountryRegion": "Vec<u8>",
            "Duration": "u8",
            "Node": {
                "account_id": "AccountId",
                "ipv4": "IpV4",
                "country": "CountryRegion",
                "expire": "BlockNumber"
            },
            "ChannelOf": {
                "sender": "AccountId",
                "receiver": "AccountId",
                "balance": "Balance",
                "nonce": "u64",
                "opened": "BlockNumber",
                "expiration": "BlockNumber"
            },
            "CreditDelegateInfo": {
                "delegator": "AccountId",
                "score": "u64",
                "validators": "Vec<AccountId>"
            },
            "ProposalId": "u64",
            "Limits": {
                "max_tx_value": "Balance",
                "day_max_limit": "Balance",
                "day_max_limit_for_one_address": "Balance",
                "max_pending_tx_limit": "Balance",
                "min_tx_value": "Balance"
            },
            "Status": {
                "_enum": [
                    "Revoked",
                    "Pending",
                    "PauseTheBridge",
                    "ResumeTheBridge",
                    "UpdateValidatorSet",
                    "UpdateLimits",
                    "Deposit",
                    "Withdraw",
                    "Approved",
                    "Canceled",
                    "Confirmed"
                ]
            },
            "Kind": {
               "_enum": [
                   "Transfer",
                   "Limits",
                   "Validator",
                   "Bridge"
               ]
            },
            "TransferMessage": {
                "message_id": "H256",
                "eth_address": "H160",
                "substrate_address": "AccountId",
                "amount": "Balance",
                "status": "Status",
                "direction": "Status"
            },
            "LimitMessage": {
                "id": "H256",
                "limits": "Limits",
                "status": "Status"
            },
            "BridgeMessage": {
                "message_id": "H256",
                "account": "AccountId",
                "status": "Status",
                "action": "Status"
            },
            "ValidatorMessage": {
                "message_id": "H256",
                "quorum": "u64",
                "accounts": "Vec<AccountId>",
                "status": "Status",
                "action": "Status"
            },
            "BridgeTransfer": {
                "transfer_id": "ProposalId",
                "message_id": "H256",
                "open": "bool",
                "votes": "MemberId",
                "kind": "Kind"
            },
            "AccountData": {
                "free": "Balance",
                "reserved": "Balance",
                "misc_frozen": "Balance",
                "fee_frozen": "Balance",
            },
	    "Account": {
		"nonce": "U256",
		"balance": "U256"
	    },
	    "Transaction": {
		"nonce": "U256",
		"action": "String",
		"gas_price": "u64",
		"gas_limit": "u64",
		"value": "U256",
		"input": "Vec<u8>",
		"signature": "Signature"
	    },
	    "Signature": {
		"v": "u64",
		"r": "H256",
		"s": "H256"
	    }
        },
    });

    return api;
}

let createContract = (exports.createConstract = async function (api, source, init, value, gas_limit, gas_price, nonce) {
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice', { name: 'Alice default' });
    const txHash = await api.tx.evm
        .create(source, init, value, gas_limit, gas_price, nonce)
        .signAndSend(signer, ({ events = [], status }) => {
            if (status.isFinalized) {
                events.forEach(({ phase, event: { data, method, section } }) => {
                    if (method == "ExtrinsicFailed")
                        console.log("setTransfer Failed");
                    else if (method == "ExtrinsicSuccess")
                        console.log("setTransfer Succeeded");
                });
            }
        });
    await new Promise(r => setTimeout(r, 10000));
});

let getAcctBalance = (exports.getAcctBalance = async function (api, accountId) {
    let balance = await api.rpc.eth.getBalance(accountId);
    return balance.toString();
});

let getTokenBalance = (exports.getTokenBalance = async function (api, address, slot) {
    let balance = await api.query.evm.accountStorages(address, slot);
    console.log(balance.toString());
    return balance;
});

const input = '0xa9059cbb0000000000000000000000008eaf04151687736326c9fea17e25fc528761369300000000000000000000000000000000000000000000000000000000000000dd';

let tokenTransfer = (exports.tokenTransfer = async function (api, source, target, input, value, gas_limit, gas_price, nonce) {
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice', { name: 'Alice default' });
    const txHash = await api.tx.evm
        .call(source, target, input, value, gas_limit, gas_price, nonce)
        .signAndSend(signer, ({ events = [], status }) => {
            if (status.isFinalized) {
                events.forEach(({ phase, event: { data, method, section } }) => {
                    if (method == "ExtrinsicFailed")
                        console.log("setTransfer Failed");
                    else if (method == "ExtrinsicSuccess")
                        console.log("setTransfer Succeeded");
                });
            }
        });
    await new Promise(r => setTimeout(r, 10000));
});

async function test() {
    const api = await getApi();
    let alice_balance = await getAcctBalance(api, alice);
    if (alice_balance != alice_balance_init) {
        console.log('Account balance of Alice is not right');
        return;
    }
    console.log('Account balance of Alice is right');
    await createContract(api, alice, erc20_bytecode, 0, 4294967295, 1, null);

    let alice_token_before = await getTokenBalance(api, smart_contract_address, alice_storage_slot);
    let bob_token_before = await getTokenBalance(api, smart_contract_address, bob_storage_slot);

    await tokenTransfer(api, alice, smart_contract_address, input, 0, 4294967295, 1, null);

    let alice_token_after = await getTokenBalance(api, smart_contract_address, alice_storage_slot);
    let bob_token_after = await getTokenBalance(api, smart_contract_address, bob_storage_slot);

    if (bob_token_after - bob_token_before != 0xdd)
        console.log("token transfer failed!!!");
    else
        console.log("test is successful!");
}

test().then(() => {
    console.log("test is over");
    process.exit();
});



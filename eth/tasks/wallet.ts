import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
    Wallet,
    HDNodeWallet,
    Mnemonic,
    randomBytes,
    formatEther,
    parseEther,
    parseUnits,
    isAddress,
} from "ethers";

task("wallet:new", "generate a new wallet mnemonic").setAction(walletNew);

async function walletNew({ }, hre: HardhatRuntimeEnvironment) {
    const mnemonic = Mnemonic.fromEntropy(randomBytes(16));
    const wallet = HDNodeWallet.fromMnemonic(mnemonic);

    console.log("mnemonic:", mnemonic.phrase);
    console.log("address:", wallet.address);
    console.log("privateKey:", wallet.privateKey);
}

task("wallet:info", "show deployer wallet public address and balance").setAction(walletInfo);

async function walletInfo({ }, hre: HardhatRuntimeEnvironment) {
    const [deployer] = await hre.ethers.getSigners();

    console.log("address:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("balance:", formatEther(balance));
}

task("wallet:send", "send the native currency of this chain (ETH on mainnet, xDAI on xDAI chain)")
    .addParam("from", "sender address", undefined, types.string)
    .addParam("to", "receiver address", undefined, types.string)
    .addParam("value", "value to send (in units of ETH/xDAI)", undefined, types.float)
    .addParam(
        "dry",
        "dry run only (doesn't carry out transaction, just verifies that it's valid). default: true",
        true,
        types.boolean
    )
    .addParam("gaspricegwei", "gas price in gwei", 1, types.float)
    .addParam("confirmations", "confirmations to wait", 1, types.int)
    .setAction(sendValue);

async function sendValue(
    args: {
        from: string;
        to: string;
        value: number;
        dry: boolean;
        gaspricegwei: number;
        confirmations: number;
    },
    hre: HardhatRuntimeEnvironment
) {
    if (!isAddress(args.to)) {
        throw new Error(`TO address ${args.to} is NOT a valid address.`);
    }

    if (!isAddress(args.from)) {
        throw new Error(`FROM address ${args.from} is NOT a valid address.`);
    }

    const accounts = await hre.ethers.getSigners();
    const sender = accounts.find(
        (account) => account.address.toLowerCase() === args.from.toLowerCase()
    );

    if (!sender) {
        throw new Error(
            `FROM address ${args.from} not found in local wallet! Check your hardhat.config file`
        );
    }

    const parsedValue = parseEther(args.value.toString());
    const balance = await hre.ethers.provider.getBalance(sender.address);

    if (balance < parsedValue) {
        throw new Error(
            `${sender.address} trying to send ~$${formatEther(
                parsedValue
            )} but has ${formatEther(balance)}. Top up and rerun.`
        );
    }

    const gasPrice = parseUnits(args.gaspricegwei.toString(), "gwei");

    if (gasPrice > parseUnits("1000", "gwei")) {
        throw new Error(`GAS PRICE TOO HIGH: ${args.gaspricegwei} gwei`);
    }

    console.log(
        `[${hre.network.name}] Sending ${args.value} from ${sender.address} to ${args.to} with gas price ${args.gaspricegwei} gwei\n`
    );

    if (!args.dry) {
        const txResponse = await sender.sendTransaction({
            to: args.to,
            value: parsedValue,
            gasPrice,
        });

        console.log(`Tx submitted with hash: ${txResponse.hash}\n`);

        const txReceipt = await txResponse.wait(args.confirmations);
        console.log(`Tx confirmed at block ${txReceipt?.blockNumber} (${args.confirmations} confirmations).\n`);
    } else {
        console.log(
            'Dry run successful; exiting without performing transaction. Run with "--dry false" to execute tx.'
        );
    }
}
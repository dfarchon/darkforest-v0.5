import React, { useState, useEffect, useRef } from "react";
import GameManager from "../api/GameManager";
import GameUIManagerContext from "./board/GameUIManagerContext";
import GameUIManager, { GameUIManagerEvent } from "./board/GameUIManager";
import { unsupportedFeatures, Incompatibility } from "../api/BrowserChecks";
import {
  submitWhitelistKey,
  submitInterestedEmail,
  submitPlayerEmail,
  EmailResponse,
  requestDevFaucet,
} from "../api/UtilityServerAPI";
import _ from "lodash";
import TerminalEmitter, {
  TerminalTextStyle,
  TerminalEvent,
} from "../utils/TerminalEmitter";
import Terminal from "./Terminal";
import { useHistory, useParams, useLocation } from "react-router-dom";
import ModalWindow from "./ModalWindow";
import GameWindow from "./GameWindow";
import {
  Wrapper,
  TerminalWrapper,
  GameWindowWrapper,
  TerminalToggler,
} from "./GameLandingPageComponents";
import UIEmitter, { UIEmitterEvent } from "../utils/UIEmitter";
import { utils, Wallet } from "ethers";
import ethConnection from "../api/EthConnection";
import { address, CheckedTypeUtils } from "../utils/CheckedTypeUtils";
import { UIDataKey, useStoredUIState } from "../api/UIStateStorageManager";
import TutorialManager, { TutorialState } from "../utils/TutorialManager";
import { TerminalPromptType } from "../_types/darkforest/app/board/utils/TerminalTypes";
import { BLOCK_EXPLORER_URL, CHAIN_FACUET, CHAIN_NAME } from "../utils/constants";
import { neverResolves } from "../utils/Utils";
import EthConnection from "../api/EthConnection";

enum InitState {
  NONE,
  COMPATIBILITY_CHECKS_PASSED,
  DISPLAY_ACCOUNTS,
  GENERATE_ACCOUNT,
  IMPORT_ACCOUNT,
  ACCOUNT_SET,
  ASKING_HAS_WHITELIST_KEY,
  ASKING_WAITLIST_EMAIL,
  ASKING_WHITELIST_KEY,
  ASKING_PLAYER_EMAIL,
  FETCHING_ETH_DATA,
  ASK_ADD_ACCOUNT,
  ADD_ACCOUNT,
  NO_HOME_PLANET,
  SEARCHING_FOR_HOME_PLANET,
  ALL_CHECKS_PASS,
  COMPLETE,
  TERMINATED,
  ERROR,
}

// doing it this way because I plan to add more later
enum ModalState {
  NONE,
  GAS_PRICES,
}

export enum InitRenderState {
  NONE,
  LOADING,
  COMPLETE,
}

export default function GameLandingPage(_props: { replayMode: boolean }) {
  // const [ethConnection, _setEthConnection] = useState(new EthConnection());
  const [gameManager, setGameManager] = useState<GameManager | undefined>();

  const history = useHistory();
  const location = useLocation();
  const isProd = process.env.NODE_ENV === "production";
  const { contractAddress } = useParams<{ contractAddress?: string }>();

  let initState = InitState.NONE;
  const [initRenderState, setInitRenderState] = useState<InitRenderState>(
    InitRenderState.NONE
  );

  // Add URL parameter handling
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const privateKey = params.get('privateKey');

    if (privateKey) {
      const ethConnection = EthConnection.getInstance();
      try {
        const newAddr = address(utils.computeAddress(privateKey));

        // Check if account already exists
        const knownAddrs = ethConnection.getKnownAccounts();
        const accountExists = knownAddrs.some(addr => addr === newAddr);

        if (!accountExists) {
          ethConnection.addAccount(privateKey);
        }

        ethConnection.setAccount(newAddr);
        initState = InitState.ACCOUNT_SET;
      } catch (e) {
        console.error('Failed to import private key from URL:', e);
      }
    }
  }, [location]);

  // Add default contract address handling
  useEffect(() => {
    if (location.pathname.includes('game1') && !contractAddress) {
      // Get default contract address based on environment
      const defaultContractAddress = isProd
        ? require('../utils/prod_contract_addr').contractAddress
        : require('../utils/local_contract_addr').contractAddress;

      history.replace(`/game1/${defaultContractAddress}${location.search}`);
    }
  }, [location, contractAddress, history, isProd]);

  useEffect(() => {
    const uiEmitter = UIEmitter.getInstance();
    uiEmitter.emit(UIEmitterEvent.UIChange);
  }, [initRenderState]);

  const [modal, setModal] = useState<ModalState>(ModalState.NONE);
  const modalClose = () => setModal(ModalState.NONE);

  const gameUIManagerRef = useRef<GameUIManager | null>(null);

  const [terminalEnabled, setTerminalEnabled] = useStoredUIState<boolean>(
    UIDataKey.terminalEnabled,
    gameUIManagerRef.current
  );

  // emit event on terminal toggle
  useEffect(() => {
    if (!terminalEnabled) {
      const tutorialManager = TutorialManager.getInstance();
      tutorialManager.acceptInput(TutorialState.Terminal);
    }
  }, [terminalEnabled]);

  const getUserInput = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    console.log('Enabling user input and waiting for response...');
    terminalEmitter.enableUserInput();
    const ret: string = await new Promise((resolve) => {
      // terminalEmitter.once(TerminalEvent.UserEnteredInput, resolve);
      const handleUserInput = (input: string) => {
        console.log('Received user input:', input);
        resolve(input);
      };

      terminalEmitter.once(TerminalEvent.UserEnteredInput, handleUserInput);
    });

    console.log('User input received, disabling input field:', ret);
    terminalEmitter.disableUserInput();

    return ret.trim();
  };

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const animEllipsis = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const delay = 0; // TODOPR 250
    for (const _i in _.range(3)) {
      await wait(delay).then(() => terminalEmitter.print("."));
    }
    await wait(delay * 1.5);
    return;
  };

  const advanceStateFromNone = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    if (!isProd) {
      terminalEmitter.emit(TerminalEvent.SkipAllTyping);
    }

    const lastUpdated = localStorage.getItem("lastUpdated");
    if (lastUpdated) {
      const diff = Date.now() - parseInt(lastUpdated);
      // 10 min
      if (diff < 1000 * 60 * 10)
        terminalEmitter.emit(TerminalEvent.SkipAllTyping);
    }
    terminalEmitter.bashShell("df init");
    terminalEmitter.println("Initializing Dark Forest...");

    terminalEmitter.print("Loading zkSNARK proving key");
    await animEllipsis();
    terminalEmitter.print(" ");
    terminalEmitter.println(
      "Proving key loaded. (14.3MB)",
      TerminalTextStyle.Blue
    );

    terminalEmitter.print("Verifying zkSNARK params");
    await animEllipsis();
    terminalEmitter.print(" ");
    terminalEmitter.println(
      "28700 constraints verified.",
      TerminalTextStyle.Blue
    );

    terminalEmitter.print("Connecting to Ethereum L2");
    await animEllipsis();
    terminalEmitter.print(" ");
    terminalEmitter.println("Connected to " + CHAIN_NAME + ".", TerminalTextStyle.Blue);

    terminalEmitter.print("Installing flux capacitor");
    await animEllipsis();
    terminalEmitter.print(" ");
    terminalEmitter.println(
      "Flux capacitor installed.",
      TerminalTextStyle.Blue
    );

    terminalEmitter.println("Initialization complete.");
    terminalEmitter.newline();
    const issues = await unsupportedFeatures();

    // $ df check
    terminalEmitter.bashShell("df check");

    terminalEmitter.print("Checking compatibility");
    await animEllipsis();
    terminalEmitter.print(" ");
    if (issues.includes(Incompatibility.MobileOrTablet)) {
      terminalEmitter.println(
        "ERROR: Mobile or tablet device detected. Please use desktop.",
        TerminalTextStyle.Red
      );
    } else {
      terminalEmitter.println(
        "Desktop detected. Device OK.",
        TerminalTextStyle.White
      );
    }

    terminalEmitter.print("Checking if IndexedDB is present");
    await animEllipsis();
    terminalEmitter.print(" ");
    if (issues.includes(Incompatibility.NoIDB)) {
      terminalEmitter.println(
        "ERROR: IndexedDB not found. Try using a different browser.",
        TerminalTextStyle.Red
      );
    } else {
      terminalEmitter.println("IndexedDB detected.", TerminalTextStyle.White);
    }

    terminalEmitter.print("Checking if browser is supported");
    await animEllipsis();
    terminalEmitter.print(" ");
    if (issues.includes(Incompatibility.UnsupportedBrowser)) {
      terminalEmitter.println(
        "ERROR: Browser unsupported. Try Brave, Firefox, or Chrome.",
        TerminalTextStyle.Red
      );
    } else {
      terminalEmitter.println("Browser Supported.", TerminalTextStyle.White);
    }

    terminalEmitter.print("Checking Ethereum Mainnet");
    await animEllipsis();
    terminalEmitter.print(" ");
    terminalEmitter.printLink(
      "ERROR: Gas prices too high!",
      () => setModal(ModalState.GAS_PRICES),
      TerminalTextStyle.White
    );
    terminalEmitter.newline();
    terminalEmitter.print("Falling back to L2");
    await animEllipsis();
    terminalEmitter.print(" ");
    terminalEmitter.println(
      "Connected to " + CHAIN_NAME + " network.",
      TerminalTextStyle.White
    );

    if (issues.length > 0) {
      terminalEmitter.print(
        `${issues.length.toString()} errors found. `,
        TerminalTextStyle.Red
      );
      terminalEmitter.println("Please resolve them and refresh the page.");
      initState = InitState.ASKING_WAITLIST_EMAIL;
    } else {
      terminalEmitter.println("All checks passed.", TerminalTextStyle.Green);
      terminalEmitter.newline();
      initState = InitState.COMPATIBILITY_CHECKS_PASSED;
    }
  };

  const advanceStateFromCompatibilityPassed = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.bashShell("df log");
    terminalEmitter.newline();
    terminalEmitter.print("    ");
    terminalEmitter.print("Version", TerminalTextStyle.Underline);
    terminalEmitter.print("    ");
    terminalEmitter.print("Date", TerminalTextStyle.Underline);
    terminalEmitter.print("              ");
    terminalEmitter.print("Champion", TerminalTextStyle.Underline);
    terminalEmitter.newline();

    terminalEmitter.print("    v0.1       ");
    terminalEmitter.print("02/05/2020        ", TerminalTextStyle.White);
    terminalEmitter.printLink(
      "Dylan Field",
      () => {
        window.open("https://twitter.com/zoink");
      },
      TerminalTextStyle.White
    );
    terminalEmitter.newline();
    terminalEmitter.print("    v0.2       ");
    terminalEmitter.println(
      "06/06/2020        Nate Foss",
      TerminalTextStyle.White
    );
    terminalEmitter.print("    v0.3       ");
    terminalEmitter.print("08/07/2020        ", TerminalTextStyle.White);
    terminalEmitter.printLink(
      "[ANON] Singer",
      () => {
        window.open("https://twitter.com/hideandcleanse");
      },
      TerminalTextStyle.White
    );
    terminalEmitter.newline();
    terminalEmitter.print("    v0.4       ");
    terminalEmitter.print("10/02/2020        ", TerminalTextStyle.White);
    terminalEmitter.printLink(
      "Jacob Rosenthal",
      () => {
        window.open("https://twitter.com/jacobrosenthal");
      },
      TerminalTextStyle.White
    );
    terminalEmitter.newline();
    terminalEmitter.print("    v0.5       ");
    terminalEmitter.print("12/25/2020        ", TerminalTextStyle.White);
    terminalEmitter.println("<tbd>", TerminalTextStyle.White);
    terminalEmitter.newline();

    const knownAddrs = ethConnection.getInstance().getKnownAccounts();
    terminalEmitter.println(
      `Found ${knownAddrs.length} accounts on this device.`
    );
    if (knownAddrs.length > 0) {
      terminalEmitter.println("(a) Login with existing account.");
    }
    terminalEmitter.println(`(n) Generate new burner wallet account.`);
    terminalEmitter.println(`(i) Import private key.`);
    terminalEmitter.println(`Select an option.`, TerminalTextStyle.White);

    const userInput = await getUserInput();
    if (userInput.toLowerCase() === "a") {
      initState = InitState.DISPLAY_ACCOUNTS;
    } else if (userInput.toLowerCase() === "n") {
      initState = InitState.GENERATE_ACCOUNT;
    } else if (userInput.toLowerCase() === "i") {
      initState = InitState.IMPORT_ACCOUNT;
    } else {
      terminalEmitter.println(`Unrecognized input: '${userInput}'. Please try again.`);
    }
  };

  const advanceStateFromDisplayAccounts = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const knownAddrs = ethConnection.getInstance().getKnownAccounts();
    terminalEmitter.println(`Select an account.`, TerminalTextStyle.White);
    for (let i = 0; i < knownAddrs.length; i += 1) {
      terminalEmitter.println(`(${i + 1}): ${knownAddrs[i]}`);
    }
    const selection = +(await getUserInput());
    if (isNaN(selection) || selection > knownAddrs.length) {
      terminalEmitter.println("Unrecognized input. Please try again.");
    } else {
      const addr = knownAddrs[selection - 1];
      try {
        ethConnection.getInstance().setAccount(addr);
        initState = InitState.ACCOUNT_SET;
      } catch (e) {
        terminalEmitter.println(
          "An unknown error occurred. please try again.",
          TerminalTextStyle.Red
        );
      }
    }
  };

  const advanceStateFromGenerateAccount = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const newWallet = Wallet.createRandom();
    const newSKey = newWallet.privateKey;
    const newAddr = CheckedTypeUtils.address(newWallet.address);
    try {
      ethConnection.getInstance().addAccount(newSKey);
      ethConnection.getInstance().setAccount(newAddr);
      terminalEmitter.println(
        `Created new burner wallet with address ${newAddr}.`
      );
      terminalEmitter.println(
        "NOTE: BURNER WALLETS ARE STORED IN BROWSER LOCAL STORAGE.",
        TerminalTextStyle.White
      );
      terminalEmitter.println(
        "They are relatively insecure and you should avoid storing substantial funds in them."
      );
      terminalEmitter.println(
        "Also, clearing browser local storage/cache will render your burner wallets inaccessible, unless you export your private keys."
      );
      terminalEmitter.println(
        "Press any key to continue.",
        TerminalTextStyle.White
      );

      await getUserInput();
      initState = InitState.ACCOUNT_SET;
    } catch (e) {
      terminalEmitter.println(
        "An unknown error occurred. please try again.",
        TerminalTextStyle.Red
      );
    }
  };

  const advanceStateFromImportAccount = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println(
      "Enter the 0x-prefixed private key of the account you wish to import",
      TerminalTextStyle.White
    );
    terminalEmitter.println(
      "NOTE: THIS WILL STORE THE PRIVATE KEY IN YOUR BROWSER'S LOCAL STORAGE",
      TerminalTextStyle.White
    );
    terminalEmitter.println(
      "Local storage is relatively insecure. We recommend only importing accounts with zero-to-no funds."
    );
    const newSKey = await getUserInput();
    try {
      const newAddr = CheckedTypeUtils.address(utils.computeAddress(newSKey));
      ethConnection.getInstance().addAccount(newSKey);
      ethConnection.getInstance().setAccount(newAddr);
      terminalEmitter.println(`Imported account with address ${newAddr}.`);
      initState = InitState.ACCOUNT_SET;
    } catch (e) {
      terminalEmitter.println(
        "An unknown error occurred. please try again.",
        TerminalTextStyle.Red
      );
    }
  };

  const advanceStateFromAccountSet = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();

    try {
      const address = ethConnection.getInstance().getAddress();
      const isWhitelisted = true; //await ethConnection.getInstance().isWhitelisted(address);

      terminalEmitter.bashShell("df join v0.5");
      terminalEmitter.print("Checking if whitelisted... (address ");
      terminalEmitter.print(address, TerminalTextStyle.White);
      terminalEmitter.println(")");

      if (isWhitelisted) {
        terminalEmitter.println("Player whitelisted.", TerminalTextStyle.Green);
        terminalEmitter.print(`Welcome, player `);
        terminalEmitter.printLink(
          address,
          () => {
            navigator.clipboard.writeText(address);
            terminalEmitter.println(
              "\nAddress copied to clipboard!",
              TerminalTextStyle.Sub
            );
          },
          TerminalTextStyle.White,
          true
        );
        terminalEmitter.newline();

        const balance = await ethConnection.getInstance().getBalance(address);
        terminalEmitter.println(
          `Current balance: ${balance} ETH`,
          TerminalTextStyle.White
        );


        // Add copy buttons
        terminalEmitter.print('[ ', TerminalTextStyle.Sub);
        terminalEmitter.printLink(
          'Copy Public Key',
          () => {
            navigator.clipboard.writeText(address);
            terminalEmitter.println(
              '\nPublic key copied to clipboard!',
              TerminalTextStyle.Green
            );
          },
          TerminalTextStyle.Blue
        );
        terminalEmitter.print(' | ', TerminalTextStyle.Sub);
        terminalEmitter.printLink(
          'Copy Private Key',
          () => {
            const privateKey = ethConnection.getInstance().getPrivateKey();
            navigator.clipboard.writeText(privateKey);
            terminalEmitter.println(
              '\nPrivate key copied to clipboard!',
              TerminalTextStyle.Green
            );
          },
          TerminalTextStyle.Blue
        );
        terminalEmitter.println(' ]', TerminalTextStyle.Sub);


        terminalEmitter.print(
          '\nNeed ETH? Visit: ',
          TerminalTextStyle.White
        );
        terminalEmitter.printLink(
          CHAIN_FACUET,
          () => {
            window.open(CHAIN_FACUET, '_blank');
          },
          TerminalTextStyle.Blue
        );
        terminalEmitter.newline();



        if (!isProd) {
          // in development, automatically get some ether from faucet
          const balance = await ethConnection.getInstance().getBalance(address);
          if (balance === 0) {
            await requestDevFaucet(address);
          }
        }
        initState = InitState.FETCHING_ETH_DATA;
      } else {
        initState = InitState.ASKING_HAS_WHITELIST_KEY;
      }
    } catch (e) {
      console.error(`error connecting to whitelist: ${e}`);
      terminalEmitter.println(
        "ERROR: Could not connect to whitelist contract. Please refresh and try again in a few minutes.",
        TerminalTextStyle.Red
      );
      initState = InitState.TERMINATED;
    }
  };

  const advanceStateFromAskHasWhitelistKey = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();

    terminalEmitter.print(
      "Do you have a whitelist key?",
      TerminalTextStyle.White
    );
    terminalEmitter.println(" (y/n)");
    const userInput = await getUserInput();
    if (userInput === "y") {
      initState = InitState.ASKING_WHITELIST_KEY;
    } else if (userInput === "n") {
      initState = InitState.ASKING_WAITLIST_EMAIL;
    } else {
      terminalEmitter.println("Unrecognized input. Please try again.");
    }
  };

  const advanceStateFromAskWhitelistKey = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const address = ethConnection.getInstance().getAddress();

    terminalEmitter.println(
      "Please enter your invite key. (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)",
      TerminalTextStyle.Sub
    );

    const key = await getUserInput();

    terminalEmitter.print("Processing key... (this may take up to 30s)");
    const txHash = await (async () => {
      const intervalId = setInterval(() => terminalEmitter.print("."), 3000);
      const ret = await submitWhitelistKey(key, address);
      clearInterval(intervalId);
      return ret;
    })();
    terminalEmitter.newline();

    if (!txHash) {
      terminalEmitter.println("ERROR: Not a valid key.", TerminalTextStyle.Red);
      initState = InitState.ASKING_WAITLIST_EMAIL;
    } else {
      terminalEmitter.print(
        "Successfully joined game. ",
        TerminalTextStyle.Green
      );
      terminalEmitter.print(`Welcome, player `);
      terminalEmitter.printLink(
        address,
        () => {
          navigator.clipboard.writeText(address);
          terminalEmitter.println(
            "\nAddress copied to clipboard!",
            TerminalTextStyle.Sub
          );
        },
        TerminalTextStyle.White,
        true
      );
      terminalEmitter.newline();
      terminalEmitter.print("Sent player $0.05 :) ", TerminalTextStyle.Blue);
      terminalEmitter.printLink(
        "(View Transaction)",
        () => {
          window.open(`${BLOCK_EXPLORER_URL}/tx/${txHash}`);
        },
        TerminalTextStyle.Blue
      );
      terminalEmitter.newline();
      initState = InitState.ASKING_PLAYER_EMAIL;
    }
  };

  const advanceStateFromAskWaitlistEmail = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println(
      "Enter your email address to sign up for the whitelist.",
      TerminalTextStyle.White
    );
    const email = await getUserInput();
    terminalEmitter.print("Response pending... ");
    const response = await submitInterestedEmail(email);
    if (response === EmailResponse.Success) {
      terminalEmitter.println(
        "Email successfully recorded. ",
        TerminalTextStyle.Green
      );
      terminalEmitter.println(
        "Keep an eye out for updates and invite keys in the next few weeks. Press ENTER to return to the homepage.",
        TerminalTextStyle.Sub
      );
      initState = InitState.TERMINATED;
      await getUserInput();
      history.push("/");
    } else if (response === EmailResponse.Invalid) {
      terminalEmitter.println(
        "Email invalid. Please try again.",
        TerminalTextStyle.Red
      );
    } else {
      terminalEmitter.print("ERROR: Server error. ", TerminalTextStyle.Red);
      terminalEmitter.print(
        "Press ENTER to return to homepage.",
        TerminalTextStyle.Sub
      );
      await getUserInput();
      initState = InitState.TERMINATED;
      history.push("/");
    }
  };

  const advanceStateFromAskPlayerEmail = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const address = ethConnection.getInstance().getAddress();

    terminalEmitter.print(
      "Enter your email address. ",
      TerminalTextStyle.White
    );
    terminalEmitter.println(
      "We'll use this email address to notify you if you win a prize."
    );
    const email = await getUserInput();
    const response = await submitPlayerEmail(email, address);
    if (response === EmailResponse.Success) {
      terminalEmitter.println("Email successfully recorded.");
      initState = InitState.FETCHING_ETH_DATA;
    } else if (response === EmailResponse.Invalid) {
      terminalEmitter.println(
        "Email invalid. Please try again.",
        TerminalTextStyle.Red
      );
    } else {
      terminalEmitter.println(
        "Server error. Please try again, or contact administrator if problem persists.",
        TerminalTextStyle.Red
      );
    }
  };

  const advanceStateFromFetchingEthData = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();

    terminalEmitter.println(
      "Downloading data from Ethereum blockchain... (the contract is very big. this may take a while)"
    );

    let newGameManager: GameManager;

    try {
      newGameManager = await GameManager.create(ethConnection.getInstance(), contractAddress);
    } catch (e) {
      console.log(e);

      initState = InitState.ERROR;

      terminalEmitter.print(
        "Network under heavy load. Please refresh the page, and check ",
        TerminalTextStyle.Red
      );

      terminalEmitter.printLink(
        BLOCK_EXPLORER_URL,
        () => {
          window.open(BLOCK_EXPLORER_URL);
        },
        TerminalTextStyle.Red
      );

      terminalEmitter.println("");

      return;
    }

    setGameManager(newGameManager);

    window.df = newGameManager;

    const newGameUIManager = await GameUIManager.create(newGameManager);

    window.ui = newGameUIManager;

    terminalEmitter.println("Connected to DarkForestCore contract.");
    gameUIManagerRef.current = newGameUIManager;

    // Display current connected contract address
    const connectedContractAddress = newGameManager.getContractAddress();
    terminalEmitter.println(`Contract address: ${connectedContractAddress}`, TerminalTextStyle.Blue);

    if (!newGameManager.hasJoinedGame()) {
      initState = InitState.NO_HOME_PLANET;
    } else {
      terminalEmitter.println("Validating secret local data...");
      const browserHasData = !!newGameManager.getHomeCoords();
      if (!browserHasData) {
        terminalEmitter.println(
          "ERROR: Home coords not found on this browser.",
          TerminalTextStyle.Red
        );
        initState = InitState.ASK_ADD_ACCOUNT;
        return;
      }
      terminalEmitter.println("Initializing game...");
      initState = InitState.ALL_CHECKS_PASS;
    }
  };

  const advanceStateFromAskAddAccount = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();

    terminalEmitter.println(
      "Import account home coordinates? (y/n)",
      TerminalTextStyle.White
    );
    terminalEmitter.println(
      "If you're importing an account, make sure you know what you're doing."
    );
    const userInput = await getUserInput();
    if (userInput === "y") {
      initState = InitState.ADD_ACCOUNT;
    } else if (userInput === "n") {
      terminalEmitter.println("Try using a different account and reload.");
      initState = InitState.TERMINATED;
    } else {
      terminalEmitter.println("Unrecognized input. Please try again.");
    }
  };

  const advanceStateFromAddAccount = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const gameUIManager = gameUIManagerRef.current;

    if (gameUIManager) {
      try {
        terminalEmitter.println("x: ", TerminalTextStyle.Blue);
        const x = parseInt(await getUserInput());
        terminalEmitter.println("y: ", TerminalTextStyle.Blue);
        const y = parseInt(await getUserInput());
        if (
          Number.isNaN(x) ||
          Number.isNaN(y) ||
          Math.abs(x) > 2 ** 32 ||
          Math.abs(y) > 2 ** 32
        ) {
          throw "Invalid home coordinates.";
        }
        if (await gameUIManager.addAccount({ x, y })) {
          terminalEmitter.println("Successfully added account.");
          terminalEmitter.println("Initializing game...");
          initState = InitState.ALL_CHECKS_PASS;
        } else {
          throw "Invalid home coordinates.";
        }
      } catch (e) {
        terminalEmitter.println(`ERROR: ${e}`, TerminalTextStyle.Red);
        terminalEmitter.println("Please try again.");
      }
    } else {
      terminalEmitter.println(
        "ERROR: Game UI Manager not found. Terminating session."
      );
      initState = InitState.TERMINATED;
    }
  };

  const advanceStateFromNoHomePlanet = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();

    terminalEmitter.println("Welcome to DARK FOREST.");

    const gameUIManager = gameUIManagerRef.current;
    if (!gameUIManager) {
      terminalEmitter.println(
        "ERROR: Game UI Manager not found. Terminating session."
      );
      initState = InitState.TERMINATED;
      return;
    }

    if (Date.now() / 1000 > gameUIManager.getEndTimeSeconds()) {
      terminalEmitter.println(
        "ERROR: This game has ended. Terminating session."
      );
      initState = InitState.TERMINATED;
      return;
    }

    terminalEmitter.newline();

    terminalEmitter.println(
      "We collect a minimal set of statistics such as SNARK proving" +
      " times and average transaction times across browsers, to help " +
      "us optimize performance and fix bugs. You can opt out of " +
      "this in the settings pane."
    );

    terminalEmitter.newline();

    terminalEmitter.println(
      "Press ENTER to find a home planet. This may take up to 120s."
    );

    await getUserInput();

    const success = await new Promise(async (resolve) => {
      gameUIManager
        // TODO: remove beforeRetry: (e: Error) => Promise<boolean>
        .joinGame(async () => {
          terminalEmitter.println(
            "[ERROR] please enable popups to confirm the transaction.",
            TerminalTextStyle.Red
          );
          terminalEmitter.println(
            "Press ENTER to try again. The previous popup is invalidated."
          );
          await getUserInput();
          return true;
        })
        .once(GameUIManagerEvent.InitializedPlayer, () => {
          resolve(true);
        })
        .once(GameUIManagerEvent.InitializedPlayerError, (error: Error) => {
          terminalEmitter.println(
            `[ERROR] An error occurred: ${error.toString().slice(0, 10000)}`,
            TerminalTextStyle.Red,
            true
          );
        });
    });

    if (success) {
      terminalEmitter.println("Found suitable home planet!");
      terminalEmitter.println("Initializing game...");
      initState = InitState.ALL_CHECKS_PASS;
    }
  };

  const advanceStateFromAllChecksPass = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println("Press ENTER to begin.");
    await getUserInput();
    initState = InitState.COMPLETE;

    terminalEmitter.emit(TerminalEvent.SkipAllTyping);

    setInitRenderState(InitRenderState.COMPLETE);

    terminalEmitter.bashShell("df shell");
    terminalEmitter.changePromptType(TerminalPromptType.JS);
    terminalEmitter.allowUnfocusInput();

    terminalEmitter.println(
      "Welcome to the universe of Dark Forest.",
      TerminalTextStyle.Green
    );
    terminalEmitter.println(
      "This is the Dark Forest interactive Javascript terminal. Only use this if you know exactly what you're doing."
    );
    terminalEmitter.println("Try typing in: terminal.println(df.getAccount())");
  };

  const advanceStateFromComplete = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    window.terminal = terminalEmitter;
    const input = await getUserInput();
    let res = "";
    try {
      // indrect eval call: http://perfectionkills.com/global-eval-what-are-the-options/
      res = (1, eval)(input);
      if (res !== undefined) {
        terminalEmitter.println(res.toString(), TerminalTextStyle.White, true);
      }
    } catch (e) {
      res = e.message;
      terminalEmitter.println(`ERROR: ${res}`, TerminalTextStyle.Red, true);
    }
  };

  const advanceStateFromError = async () => {
    await neverResolves();
  };

  const advanceState = async () => {
    try {
      if (initState === InitState.NONE) {
        await advanceStateFromNone();
      } else if (initState === InitState.COMPATIBILITY_CHECKS_PASSED) {
        await advanceStateFromCompatibilityPassed();
      } else if (initState === InitState.DISPLAY_ACCOUNTS) {
        await advanceStateFromDisplayAccounts();
      } else if (initState === InitState.GENERATE_ACCOUNT) {
        await advanceStateFromGenerateAccount();
      } else if (initState === InitState.IMPORT_ACCOUNT) {
        await advanceStateFromImportAccount();
      } else if (initState === InitState.ACCOUNT_SET) {
        await advanceStateFromAccountSet();
      } else if (initState === InitState.ASKING_HAS_WHITELIST_KEY) {
        await advanceStateFromAskHasWhitelistKey();
      } else if (initState === InitState.ASKING_WHITELIST_KEY) {
        await advanceStateFromAskWhitelistKey();
      } else if (initState === InitState.ASKING_WAITLIST_EMAIL) {
        await advanceStateFromAskWaitlistEmail();
      } else if (initState === InitState.ASKING_PLAYER_EMAIL) {
        await advanceStateFromAskPlayerEmail();
      } else if (initState === InitState.FETCHING_ETH_DATA) {
        await advanceStateFromFetchingEthData();
      } else if (initState === InitState.ASK_ADD_ACCOUNT) {
        await advanceStateFromAskAddAccount();
      } else if (initState === InitState.ADD_ACCOUNT) {
        await advanceStateFromAddAccount();
      } else if (initState === InitState.NO_HOME_PLANET) {
        await advanceStateFromNoHomePlanet();
      } else if (initState === InitState.ALL_CHECKS_PASS) {
        await advanceStateFromAllChecksPass();
      } else if (initState === InitState.COMPLETE) {
        await advanceStateFromComplete();
      } else if (initState === InitState.ERROR) {
        await advanceStateFromError();
      }
      console.log('After processing, state is now:', initState);

      if (initState !== InitState.TERMINATED) {
        setTimeout(() => advanceState(), 0);
      }
    } catch (error) {
      console.error('Error in advanceState:', error);
      // Try to continue after error occurs
      setTimeout(() => advanceState(), 1000);
    }
  };

  useEffect(() => {
    advanceState();

    return () => {
      if (gameUIManagerRef.current) {
        gameUIManagerRef.current.destroy();
        gameUIManagerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper initRender={initRenderState} terminalEnabled={terminalEnabled}>
      {modal === ModalState.GAS_PRICES && (
        <ModalWindow close={modalClose}>
          <img
            style={{ margin: "0 auto" }}
            src={"/public/img/toodamnhigh.jpg"}
          />
        </ModalWindow>
      )}

      {/* everything inside of GameWindowWrapper and TerminalWrapper
          should basically assume that they are in a fresh div. 
          the children should never exceed the contents of that div.
      */}
      <GameWindowWrapper
        initRender={initRenderState}
        terminalEnabled={terminalEnabled}
      >
        <GameUIManagerContext.Provider value={gameUIManagerRef.current}>
          {gameUIManagerRef.current && gameManager && (
            <GameWindow uiManager={gameUIManagerRef.current} />
          )}
        </GameUIManagerContext.Provider>
        <TerminalToggler
          terminalEnabled={terminalEnabled}
          setTerminalEnabled={setTerminalEnabled}
        />
      </GameWindowWrapper>
      <TerminalWrapper
        initRender={initRenderState}
        terminalEnabled={terminalEnabled}
      >
        <Terminal />
      </TerminalWrapper>
    </Wrapper>
  );
}

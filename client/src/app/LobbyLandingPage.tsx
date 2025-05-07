import React, { useState, useEffect, useRef } from "react";
import GameManager from "../api/GameManager";
import GameUIManagerContext from "./board/GameUIManagerContext";
import GameUIManager, { GameUIManagerEvent } from "./board/GameUIManager";
import AbstractGameManager from "../api/GameManager";
import { unsupportedFeatures, Incompatibility } from "../api/BrowserChecks";
import {
  isAddressWhitelisted,
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
import { useHistory } from "react-router-dom";
import ModalWindow from "./ModalWindow";
import GameWindow from "./GameWindow";
import {
  Wrapper,
  TerminalWrapper,
  Hidden,
  GameWindowWrapper,
  TerminalToggler,
} from "./GameLandingPageComponents";
import UIEmitter, { UIEmitterEvent } from "../utils/UIEmitter";
import { utils, Wallet } from "ethers";
import EthereumAccountManager from "../api/EthConnection";
import { address } from "../utils/CheckedTypeUtils";
import { UIDataKey, useStoredUIState } from "../api/UIStateStorageManager";
import TutorialManager, { TutorialState } from "../utils/TutorialManager";
import { TerminalPromptType } from "../_types/darkforest/app/board/utils/TerminalTypes";
import { BLOCK_EXPLORER_URL } from "../utils/constants";
import styled from "styled-components";
import {
  DEFAULT_GAME_CONFIG,
  EthAddress,
  GameConfig,
} from "../_types/global/GlobalTypes";
import GameConfigPanel from "../components/GameConfigPanel";
import BlueButton from "../components/BlueButton";

enum InitState {
  NONE,
  COMPATIBILITY_CHECKS_PASSED,
  DISPLAY_ACCOUNTS,
  GENERATE_ACCOUNT,
  IMPORT_ACCOUNT,
  ACCOUNT_SET,
  FETCHING_ETH_DATA,
  ASK_ADD_ACCOUNT,
  ADD_ACCOUNT,
  NO_HOME_PLANET,
  ALL_CHECKS_PASS,
  COMPLETE,
  TERMINATED,
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

interface StyledProps {
  $isOpen: boolean;
}

// Main page layout container
const PageLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: 1000px;
  margin: 0 auto;
  height: 100vh;
  overflow: hidden;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
`;

// Terminal area - top 1/3 of the screen
const TerminalContainer = styled.div`
  border: 2px solid #00ade1;
  border-radius: 4px;
  margin: 10px;
  box-shadow: 0 0 10px rgba(0, 173, 225, 0.3);
  height: 33vh;
  overflow: hidden;
  position: relative;
  padding: 10px;
`;

const TerminalInnerWrapper = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px;
  overflow: hidden;
`;

// Config panel area - bottom 2/3 of the screen
const ConfigPanelContainer = styled.div<StyledProps>`
  border: 2px solid #00ade1;
  border-radius: 4px;
  margin: 10px;
  box-shadow: 0 0 10px rgba(0, 173, 225, 0.3);
  height: ${(props) => (props.$isOpen ? "63vh" : "auto")};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ConfigHeader = styled.div<StyledProps>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #0a1929;
  cursor: pointer;
  user-select: none;
  border-bottom: ${(props) =>
    props.$isOpen ? "1px solid rgba(0, 173, 225, 0.3)" : "none"};
  &:hover {
    background: rgba(0, 173, 225, 0.1);
  }
`;

const HeaderTitle = styled.h2`
  color: #00ade1;
  margin: 0;
  flex-grow: 1;
  font-size: 18px;
`;

const CollapseIcon = styled.span<StyledProps>`
  color: #00ade1;
  font-size: 20px;
  transform: rotate(${(props) => (props.$isOpen ? "180deg" : "0deg")});
  transition: transform 0.2s ease;
`;

// Content area for the config panel
const ConfigPanelContent = styled.div<StyledProps>`
  flex: 1;
  overflow-y: auto;
  padding: ${(props) => (props.$isOpen ? "25px" : "0")};
  padding-bottom: 80px; /* Add space for the fixed button container */
  color: white;
  display: ${(props) => (props.$isOpen ? "block" : "none")};
  position: relative;
`;

// Button container at the bottom of config panel
const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  border-top: 1px solid rgba(0, 173, 225, 0.3);
  background: #0a1929;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;

const GameLink = styled.div`
  margin: 10px 0;
  padding: 10px;
  background-color: rgba(0, 173, 225, 0.1);
  border-radius: 4px;
  word-break: break-all;
  font-family: monospace;
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 173, 225, 0.2);
  }
`;

const AdminPanelContainer = styled.div<StyledProps>`
  border: 2px solid #00ade1;
  border-radius: 4px;
  margin: 10px;
  box-shadow: 0 0 10px rgba(0, 173, 225, 0.3);
  height: ${(props) => (props.$isOpen ? "63vh" : "auto")};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

interface GameAccount {
  address: string;
  privateKey: string;
  balance: string;
}

// Add styled input component
const StyledInput = styled.input`
  background: rgba(0, 173, 225, 0.1);
  border: 1px solid #00ade1;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  width: 100px;
  margin-right: 10px;
  &:focus {
    outline: none;
    border-color: #00ade1;
    box-shadow: 0 0 5px rgba(0, 173, 225, 0.5);
  }
`;

// Admin information display area
const AdminInfoContainer = styled.div`
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 173, 225, 0.1);
  border: 1px solid #00ade1;
  border-radius: 4px;
`;

// Add a clean divider component after AdminInfoContainer
const Divider = styled.div`
  height: 1px;
  background-color: rgba(0, 173, 225, 0.3);
  margin: 15px 0;
`;

// Add section title component
const SectionTitle = styled.div`
  font-size: 16px;
  color: #00ade1;
  margin-bottom: 15px;
  font-weight: bold;
`;

export default function LobbyLandingPage(_props: { replayMode: boolean }) {
  const history = useHistory();
  /* terminal stuff */
  const isProd = process.env.NODE_ENV === "production";

  const [initState, setInitState] = useState<InitState>(InitState.NONE);
  const [initRenderState, setInitRenderState] = useState<InitRenderState>(
    InitRenderState.NONE
  );
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

  const defaultContractAddress = isProd
    ? require("../utils/prod_contract_addr").contractAddress
    : require("../utils/local_contract_addr").contractAddress;

  const [deployedContractAddress, setDeployedContractAddress] =
    useState<string>(defaultContractAddress);
  const [gameConfig, setGameConfig] = useState<GameConfig | undefined>(
    undefined
  );
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [gameAccounts, setGameAccounts] = useState<GameAccount[]>([]);
  const [isGeneratingAccounts, setIsGeneratingAccounts] = useState(false);
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);
  const [adminBalance, setAdminBalance] = useState<string>("0");
  const [transferAmount, setTransferAmount] = useState<string>("0.01");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [isGameManagerInitialized, setIsGameManagerInitialized] =
    useState<boolean>(false);
  const [isTransferringToAll, setIsTransferringToAll] =
    useState<boolean>(false);

  // Disable body scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
    };
  }, []);

  // emit event on terminal toggle
  useEffect(() => {
    if (!terminalEnabled) {
      const tutorialManager = TutorialManager.getInstance();
      tutorialManager.acceptInput(TutorialState.Terminal);
    }
  }, [terminalEnabled]);

  const getUserInput = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    console.log(
      "LobbyLandingPage: Enabling user input and waiting for response..."
    );
    terminalEmitter.enableUserInput();

    const ret: string = await new Promise<string>((resolve) => {
      const handleUserInput = (input: string) => {
        console.log("LobbyLandingPage: Received user input:", input);
        resolve(input);
      };

      terminalEmitter.once(TerminalEvent.UserEnteredInput, handleUserInput);
    });

    console.log(
      "LobbyLandingPage: User input received, disabling input field:",
      ret
    );
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

    terminalEmitter.println("Initializing Dark Forest...");
    terminalEmitter.println("Connecting to blockchain...");
    await animEllipsis();
    terminalEmitter.println("Connected to xDAI STAKE.", TerminalTextStyle.Blue);
    terminalEmitter.newline();

    // Skip compatibility checks
    terminalEmitter.println("All systems ready.", TerminalTextStyle.Green);
    terminalEmitter.newline();
    setInitState(InitState.COMPATIBILITY_CHECKS_PASSED);
  };

  const advanceStateFromCompatibilityPassed = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();

    terminalEmitter.println("Dark Forest v0.5");
    terminalEmitter.newline();

    const knownAddrs = EthereumAccountManager.getInstance().getKnownAccounts();
    console.log("LobbyLandingPage: Found accounts:", knownAddrs);
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
    console.log("LobbyLandingPage: User selected option:", userInput);

    if (userInput.toLowerCase() === "a") {
      setInitState(InitState.DISPLAY_ACCOUNTS);
    } else if (userInput.toLowerCase() === "n") {
      setInitState(InitState.GENERATE_ACCOUNT);
    } else if (userInput.toLowerCase() === "i") {
      setInitState(InitState.IMPORT_ACCOUNT);
    } else {
      terminalEmitter.println(
        `Unrecognized input: '${userInput}'. Please try again.`
      );
    }
  };

  const advanceStateFromDisplayAccounts = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const ethConnection = EthereumAccountManager.getInstance();

    const knownAddrs = ethConnection.getKnownAccounts();
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
        ethConnection.setAccount(addr);
        setInitState(InitState.ACCOUNT_SET);
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
    const ethConnection = EthereumAccountManager.getInstance();

    const newWallet = Wallet.createRandom();
    const newSKey = newWallet.privateKey;
    const newAddr = address(newWallet.address);
    try {
      ethConnection.addAccount(newSKey);
      ethConnection.setAccount(newAddr);
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
        "Press any key to continue.",
        TerminalTextStyle.White
      );

      await getUserInput();
      setInitState(InitState.ACCOUNT_SET);
    } catch (e) {
      terminalEmitter.println(
        "An unknown error occurred. please try again.",
        TerminalTextStyle.Red
      );
    }
  };

  const advanceStateFromImportAccount = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const ethConnection = EthereumAccountManager.getInstance();

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
      const newAddr = address(utils.computeAddress(newSKey));
      ethConnection.addAccount(newSKey);
      ethConnection.setAccount(newAddr);
      terminalEmitter.println(`Imported account with address ${newAddr}.`);
      setInitState(InitState.ACCOUNT_SET);
    } catch (e) {
      terminalEmitter.println(
        "An unknown error occurred. please try again.",
        TerminalTextStyle.Red
      );
    }
  };

  const advanceStateFromAccountSet = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    const ethConnection = EthereumAccountManager.getInstance();

    const address = ethConnection.getAddress();
    // Always set as whitelisted for simplicity
    const isWhitelisted = true;

    terminalEmitter.println(
      "Account selected successfully.",
      TerminalTextStyle.Green
    );
    terminalEmitter.println(
      `Welcome, player ${address}.`,
      TerminalTextStyle.White
    );

    // Display balance
    const balance = await ethConnection.getBalance(address);
    terminalEmitter.println(
      `Current balance: ${balance} ETH`,
      TerminalTextStyle.White
    );

    // Add copy buttons
    terminalEmitter.print("[ ", TerminalTextStyle.Sub);
    terminalEmitter.printLink(
      "Copy Public Key",
      () => {
        navigator.clipboard.writeText(address);
        terminalEmitter.println(
          "\nPublic key copied to clipboard!",
          TerminalTextStyle.Green
        );
      },
      TerminalTextStyle.Blue
    );
    terminalEmitter.print(" | ", TerminalTextStyle.Sub);
    terminalEmitter.printLink(
      "Copy Private Key",
      () => {
        const privateKey = ethConnection.getPrivateKey();
        navigator.clipboard.writeText(privateKey);
        terminalEmitter.println(
          "\nPrivate key copied to clipboard!",
          TerminalTextStyle.Green
        );
      },
      TerminalTextStyle.Blue
    );
    terminalEmitter.println(" ]", TerminalTextStyle.Sub);

    terminalEmitter.println(
      "\nAccount setup complete. You can now configure and deploy a game.",
      TerminalTextStyle.Green
    );
    setInitState(InitState.COMPLETE);
    setInitRenderState(InitRenderState.COMPLETE);
  };

  const getGameLink = (contractAddress: string): string => {
    return `${window.location.origin}/game1/${contractAddress}`;
  };

  const deployContract = async () => {
    const terminalEmitter = TerminalEmitter.getInstance();
    let injectGameConfig;

    // Check if GameUIManager is initialized
    if (!gameUIManagerRef.current) {
      terminalEmitter.println(
        "Game manager not initialized. Please wait...",
        TerminalTextStyle.Red
      );

      try {
        const newGameManager: AbstractGameManager = await GameManager.create(
          EthereumAccountManager.getInstance()
        );
        window.df = newGameManager;
        const newGameUIManager = await GameUIManager.create(newGameManager);
        window.uiManager = newGameUIManager;
        gameUIManagerRef.current = newGameUIManager;
        terminalEmitter.println(
          "Game manager initialized.",
          TerminalTextStyle.Green
        );
      } catch (error) {
        console.error("Failed to initialize game manager:", error);
        terminalEmitter.println(
          "Failed to initialize game manager. See console for details.",
          TerminalTextStyle.Red
        );
        return;
      }
    }

    // Check if game config is set
    if (!gameConfig) {
      terminalEmitter.println(
        "Game configuration not set. Using default configuration.",
        TerminalTextStyle.Blue
      );
      injectGameConfig = DEFAULT_GAME_CONFIG;
      setGameConfig(injectGameConfig);
    }

    terminalEmitter.println(
      "Deploying token contract... Please confirm transaction in your wallet",
      TerminalTextStyle.White
    );

    try {
      const tokenContractAddress =
        await gameUIManagerRef.current.deployTokenContract();
      console.log("Contract deployed successfully:", tokenContractAddress);
      injectGameConfig = {
        ...(injectGameConfig || DEFAULT_GAME_CONFIG),
        tokensAddress: tokenContractAddress as EthAddress,
      };
      setGameConfig(injectGameConfig);
    } catch (error) {
      console.error("Token contract deployment failed:", error);
      terminalEmitter.println(
        `Token contract deployment failed: ${error.message || "Unknown error"}`,
        TerminalTextStyle.Red
      );
      return;
    }

    console.log("LobbyLandingPage: Game config:", injectGameConfig);

    terminalEmitter.println(
      "Deploying contract... Please confirm transaction in your wallet",
      TerminalTextStyle.White
    );

    try {
      const contractAddress = await gameUIManagerRef.current.deployContract(
        injectGameConfig
      );
      console.log("Contract deployed successfully:", contractAddress);

      setDeployedContractAddress(contractAddress);

      terminalEmitter.println(
        "Contract address: " + contractAddress,
        TerminalTextStyle.White
      );
      terminalEmitter.println(
        "Contract deployed successfully!",
        TerminalTextStyle.Green
      );

      // Generate and display game link in terminal
      const gameLink = getGameLink(contractAddress);
      terminalEmitter.println("");
      terminalEmitter.println("Game link created:", TerminalTextStyle.Sub);
      terminalEmitter.printLink(
        gameLink,
        () => window.open(gameLink, "_blank"),
        TerminalTextStyle.Blue
      );
      terminalEmitter.println("");
      terminalEmitter.println(
        'Click the link above or use the "Open Game" button to start playing!',
        TerminalTextStyle.White
      );
    } catch (error) {
      console.error("Contract deployment failed:", error);
      terminalEmitter.println(
        `Contract deployment failed: ${error.message || "Unknown error"}`,
        TerminalTextStyle.Red
      );

      // More detailed error display
      if (error.message && error.message.includes("library")) {
        terminalEmitter.println(
          "This may be due to missing library addresses. Check that local_library_addrs.ts is properly configured.",
          TerminalTextStyle.Red
        );
      } else if (error.message && error.message.includes("user denied")) {
        terminalEmitter.println(
          "Transaction was rejected in your wallet. Please try again.",
          TerminalTextStyle.Blue
        );
      } else if (error.message && error.message.includes("unknown account")) {
        terminalEmitter.println(
          "No wallet account found. Please make sure your account is properly set up.",
          TerminalTextStyle.Red
        );
        terminalEmitter.println(
          "Try refreshing the page and going through the account setup again.",
          TerminalTextStyle.Blue
        );
      } else if (error.message && error.message.includes("zero balance")) {
        terminalEmitter.println(
          "Your account has no tokens. You need some to deploy a contract.",
          TerminalTextStyle.Red
        );
        terminalEmitter.println(
          "For local development, make sure your local blockchain has funds in your account.",
          TerminalTextStyle.Blue
        );
      }
    }
  };

  const navigateToGame = () => {
    if (deployedContractAddress) {
      window.open(getGameLink(deployedContractAddress), "_blank");
    }
  };

  const copyToClipboard = () => {
    if (deployedContractAddress) {
      const gameLink = getGameLink(deployedContractAddress);
      navigator.clipboard.writeText(gameLink);

      const terminalEmitter = TerminalEmitter.getInstance();
      terminalEmitter.println(
        "Game link copied to clipboard!",
        TerminalTextStyle.Green
      );
    }
  };

  const handleSaveSettings = (config: GameConfig) => {
    setGameConfig(config);
  };

  const resetSettings = () => {
    setGameConfig(DEFAULT_GAME_CONFIG);
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println(
      "Settings reset to defaults.",
      TerminalTextStyle.Green
    );
  };

  const printGameConfig = () => {
    console.log(JSON.stringify(gameConfig, null, 2));
  };

  const advanceState = async () => {
    try {
      console.log("LobbyLandingPage: Current init state:", initState);

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
        // Terminal flow ends here with account setup
      }

      console.log(
        "LobbyLandingPage: After processing, state is now:",
        initState
      );
    } catch (error) {
      console.error("LobbyLandingPage: Error in advanceState:", error);
    }
  };

  // Initial setup
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

  // Handle state transitions
  useEffect(() => {
    if (
      initState !== InitState.NONE &&
      initState !== InitState.COMPLETE &&
      initState !== InitState.TERMINATED
    ) {
      advanceState();
    }
  }, [initState]);

  // Setup game manager when needed
  useEffect(() => {
    if (initState === InitState.COMPLETE && !gameUIManagerRef.current) {
      const setupGameManager = async () => {
        try {
          // Store initialization in window to prevent redundant calls
          if (!window.df) {
            const terminalEmitter = TerminalEmitter.getInstance();
            terminalEmitter.println(
              "Initializing game manager...",
              TerminalTextStyle.Blue
            );

            const newGameManager: AbstractGameManager =
              await GameManager.create(EthereumAccountManager.getInstance());
            window.df = newGameManager;
            const newGameUIManager = await GameUIManager.create(newGameManager);
            window.uiManager = newGameUIManager;
            gameUIManagerRef.current = newGameUIManager;

            // Initialize game config if not set
            if (!gameConfig) {
              setGameConfig(DEFAULT_GAME_CONFIG);
            }

            terminalEmitter.println(
              "Game manager initialized successfully. You can now configure and deploy a game.",
              TerminalTextStyle.Green
            );
            setIsGameManagerInitialized(true);
          } else {
            // Game manager already exists, just use that
            console.log("Game manager already exists, reusing");
            gameUIManagerRef.current = window.uiManager as GameUIManager;

            // Initialize game config if not set
            if (!gameConfig) {
              setGameConfig(DEFAULT_GAME_CONFIG);
            }
            setIsGameManagerInitialized(true);
          }
        } catch (error) {
          console.error("Failed to initialize game manager:", error);
          const terminalEmitter = TerminalEmitter.getInstance();
          terminalEmitter.println(
            "Failed to initialize game manager. See console for details.",
            TerminalTextStyle.Red
          );
        }
      };

      setupGameManager();
    }
  }, [initState]);

  const toggleConfigPanel = () => {
    setIsConfigOpen(!isConfigOpen);
    setIsAdminOpen(isConfigOpen); // Open admin when config closes
  };

  const toggleAdminPanel = () => {
    setIsAdminOpen(!isAdminOpen);
    setIsConfigOpen(isAdminOpen); // Open config when admin closes
  };

  // Get admin account balance
  const fetchAdminBalance = async () => {
    try {
      const ethConnection = EthereumAccountManager.getInstance();
      const address = ethConnection.getAddress();
      const balance = await ethConnection.getBalance(address);
      setAdminBalance(balance.toString()); // Ensure balance is a string
    } catch (error) {
      console.error("Error fetching admin balance:", error);
    }
  };

  // Initialize admin balance on component mount
  useEffect(() => {
    if (initState === InitState.COMPLETE) {
      fetchAdminBalance();
    }
  }, [initState]);

  // Transfer funds to game account
  const transferFunds = async (targetAddress: string, index: number) => {
    setIsTransferring(true);
    const terminalEmitter = TerminalEmitter.getInstance();

    try {
      const ethConnection = EthereumAccountManager.getInstance();
      const adminAddress = ethConnection.getAddress();

      // Check balance before proceeding
      const currentBalance = await ethConnection.getBalance(adminAddress);
      const transferAmountInEther = parseFloat(transferAmount);

      // Convert current balance to a comparable number
      const currentBalanceInEther = parseFloat(currentBalance.toString());

      // Add a small buffer for gas costs (0.001 ETH)
      const requiredAmount = transferAmountInEther + 0.001;

      // Check if there's enough balance
      if (currentBalanceInEther < requiredAmount) {
        terminalEmitter.println(
          `Insufficient balance. You have ${currentBalanceInEther.toFixed(
            4
          )} ETH but need at least ${requiredAmount.toFixed(
            4
          )} ETH (including gas).`,
          TerminalTextStyle.Red
        );
        alert(
          `Insufficient balance. You have ${currentBalanceInEther.toFixed(
            4
          )} ETH but need at least ${requiredAmount.toFixed(
            4
          )} ETH (including gas).`
        );
        setIsTransferring(false);
        return;
      }

      // Execute transfer using web3 methods
      terminalEmitter.println(
        `Transferring ${transferAmount} ETH to Account ${index + 1}...`,
        TerminalTextStyle.Blue
      );

      // Get provider from ethConnection
      const provider = ethConnection.getProvider();
      const wallet = new Wallet(ethConnection.getPrivateKey(), provider);

      // Execute transfer
      const tx = await wallet.sendTransaction({
        to: targetAddress,
        value: utils.parseEther(transferAmount),
        // Add explicit gas limit to avoid estimation errors
        gasLimit: 21000, // Standard gas limit for simple ETH transfers
      });

      // Wait for transaction confirmation
      await tx.wait();

      // Update admin balance
      const adminNewBalance = await ethConnection.getBalance(adminAddress);
      setAdminBalance(adminNewBalance.toString()); // Ensure balance is a string

      // Update account balances
      const updatedAccounts = await Promise.all(
        gameAccounts.map(async (acc) => {
          const newBalance = await ethConnection.getBalance(
            address(acc.address)
          );
          return {
            address: acc.address,
            privateKey: acc.privateKey,
            balance: newBalance.toString(), // Convert number to string
          };
        })
      );
      setGameAccounts(updatedAccounts);

      terminalEmitter.println(
        `Successfully transferred ${transferAmount} ETH to Account ${
          index + 1
        }`,
        TerminalTextStyle.Green
      );
    } catch (error) {
      console.error("Transfer failed:", error);

      // Improved error handling
      let errorMessage = "Unknown error";

      if (error.message) {
        // Check for common error patterns and provide more helpful messages
        if (error.message.includes("insufficient funds")) {
          errorMessage =
            "Insufficient funds for transfer. Please ensure you have enough ETH in your account.";
          alert(
            "Insufficient funds for transfer. Please ensure you have enough ETH in your account."
          );
        } else if (error.message.includes("gas required exceeds")) {
          errorMessage =
            "Gas required exceeds allowance. Try with a smaller amount or increase gas limit.";
        } else if (error.message.includes("gas price")) {
          errorMessage =
            "Gas price too low. Please try again with a higher gas price.";
        } else if (error.message.includes("nonce")) {
          errorMessage =
            "Transaction nonce error. Please refresh and try again.";
        } else if (
          error.message.includes("SERVER_ERROR") ||
          error.message.includes("processing response")
        ) {
          errorMessage =
            "Network or server error. Please check your connection and try again.";
        } else {
          // For other errors, show a cleaner version of the message
          errorMessage = error.message.replace(/\{.*\}/g, "").slice(0, 100);
        }
      }

      terminalEmitter.println(
        `Transfer failed: ${errorMessage}`,
        TerminalTextStyle.Red
      );
    }

    setIsTransferring(false);
  };

  const generateGameAccounts = async () => {
    setIsGeneratingAccounts(true);
    const newAccounts: GameAccount[] = [];

    try {
      for (let i = 0; i < 6; i++) {
        const wallet = Wallet.createRandom();
        const balance = await EthereumAccountManager.getInstance().getBalance(
          address(wallet.address)
        );
        newAccounts.push({
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balance.toString(),
        });
      }
      setGameAccounts(newAccounts);

      const terminalEmitter = TerminalEmitter.getInstance();
      terminalEmitter.println(
        "Generated 6 new game accounts successfully.",
        TerminalTextStyle.White
      );
    } catch (error) {
      console.error("Error generating accounts:", error);
      const terminalEmitter = TerminalEmitter.getInstance();
      terminalEmitter.println(
        "Failed to generate accounts. See console for details.",
        TerminalTextStyle.Red
      );
    }

    setIsGeneratingAccounts(false);
  };

  const saveAccountsToFile = () => {
    setIsSavingAccounts(true);
    try {
      // Add game links to each account and remove balance
      const accountsData = gameAccounts.map((acc) => ({
        address: acc.address,
        privateKey: acc.privateKey,
        gameLink: `${window.location.origin}/game1/${deployedContractAddress}?privateKey=${acc.privateKey}`,
      }));

      const blob = new Blob([JSON.stringify(accountsData, null, 2)], {
        type: "application/json",
      });
      // First convert to unknown, then to string as recommended by the error message
      const downloadUrl = URL.createObjectURL(blob) as unknown as string;
      const link = document.createElement("a");
      link.download = "game_accounts.json";
      link.href = downloadUrl;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      const terminalEmitter = TerminalEmitter.getInstance();
      terminalEmitter.println(
        "Game links saved to game_accounts.json",
        TerminalTextStyle.White
      );
    } catch (error) {
      console.error("Error saving accounts:", error);
      const terminalEmitter = TerminalEmitter.getInstance();
      terminalEmitter.println(
        "Failed to save accounts. See console for details.",
        TerminalTextStyle.Red
      );
    }
    setIsSavingAccounts(false);
  };

  const copyToClipboardWithMessage = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println(message, TerminalTextStyle.White);
  };

  // Add batch transfer function
  const transferToAllAccounts = async () => {
    if (gameAccounts.length === 0) {
      const terminalEmitter = TerminalEmitter.getInstance();
      terminalEmitter.println(
        "No accounts to transfer to. Please generate accounts first.",
        TerminalTextStyle.Red
      );
      return;
    }

    setIsTransferringToAll(true);
    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println(
      `Starting batch transfer of ${transferAmount} ETH to all ${gameAccounts.length} accounts...`,
      TerminalTextStyle.Blue
    );

    try {
      const ethConnection = EthereumAccountManager.getInstance();
      const adminAddress = ethConnection.getAddress();

      // Check if admin has enough balance for all transfers
      const currentBalance = await ethConnection.getBalance(adminAddress);
      const transferAmountInEther = parseFloat(transferAmount);
      const totalRequiredAmount = transferAmountInEther * gameAccounts.length;
      // Add gas cost estimation (0.001 ETH per transaction)
      const totalGasCost = 0.001 * gameAccounts.length;
      const totalCost = totalRequiredAmount + totalGasCost;

      // Convert current balance to a comparable number
      const currentBalanceInEther = parseFloat(currentBalance.toString());

      // Check if there's enough balance
      if (currentBalanceInEther < totalCost) {
        terminalEmitter.println(
          `Insufficient balance. You have ${currentBalanceInEther.toFixed(
            4
          )} ETH but need at least ${totalCost.toFixed(
            4
          )} ETH (including gas).`,
          TerminalTextStyle.Red
        );
        alert(
          `Insufficient balance. You have ${currentBalanceInEther.toFixed(
            4
          )} ETH but need at least ${totalCost.toFixed(4)} ETH (including gas).`
        );
        setIsTransferringToAll(false);
        return;
      }

      // Get provider and wallet from ethConnection
      const provider = ethConnection.getProvider();
      const wallet = new Wallet(ethConnection.getPrivateKey(), provider);

      // Execute transfers sequentially
      let successCount = 0;
      for (let i = 0; i < gameAccounts.length; i++) {
        const account = gameAccounts[i];
        try {
          terminalEmitter.println(
            `Transferring to Account ${i + 1}...`,
            TerminalTextStyle.Blue
          );

          // Execute transfer
          const tx = await wallet.sendTransaction({
            to: account.address,
            value: utils.parseEther(transferAmount),
            gasLimit: 21000, // Standard gas limit for simple ETH transfers
          });

          // Wait for transaction confirmation
          await tx.wait();

          // Update admin balance
          ethConnection.getBalance(adminAddress).then((newBalance) => {
            setAdminBalance(() => newBalance.toString());
          });

          // Update account balances
          ethConnection.getBalance(address(account.address)).then((newBalance) => {
            setGameAccounts(prev => prev.map(acc => ({address: acc.address,
              privateKey: acc.privateKey,
              balance: acc.address === account.address?newBalance.toString():acc.balance,}) 
            ));
          });

          successCount++;
          terminalEmitter.println(
            `Successfully transferred ${transferAmount} ETH to Account ${
              i + 1
            }`,
            TerminalTextStyle.Green
          );
        } catch (error) {
          terminalEmitter.println(
            `Failed to transfer to Account ${i + 1}: ${error.message}`,
            TerminalTextStyle.Red
          );
        }
      }

      terminalEmitter.println(
        `Batch transfer complete. Successfully transferred to ${successCount} out of ${gameAccounts.length} accounts.`,
        TerminalTextStyle.Green
      );
    } catch (error) {
      console.error("Batch transfer failed:", error);
      terminalEmitter.println(
        `Batch transfer failed: ${error.message}`,
        TerminalTextStyle.Red
      );
    }

    setIsTransferringToAll(false);
  };

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

      <PageLayout>
        {/* Terminal section - top 1/3 */}
        <TerminalContainer>
          <TerminalInnerWrapper>
            <Terminal />
          </TerminalInnerWrapper>
        </TerminalContainer>

        {/* Configuration panel - bottom 2/3 */}
        <ConfigPanelContainer $isOpen={isConfigOpen}>
          <ConfigHeader onClick={toggleConfigPanel} $isOpen={isConfigOpen}>
            <HeaderTitle>Game Configuration</HeaderTitle>
            <CollapseIcon $isOpen={isConfigOpen}>▼</CollapseIcon>
          </ConfigHeader>
          {/* Configuration panel content area - replace placeholder with GameConfigPanel */}
          <ConfigPanelContent $isOpen={isConfigOpen}>
            {initState === InitState.COMPLETE && isGameManagerInitialized ? (
              <>
                <GameConfigPanel
                  onSaveConfig={handleSaveSettings}
                  initialConfig={gameConfig}
                />

                {/* Button row at the bottom of config panel */}
                <ButtonContainer>
                  <BlueButton onClick={resetSettings}>
                    Reset to Default
                  </BlueButton>
                  {/* 
                        <BlueButton onClick={printGameConfig}>
                            Print Game Config
                        </BlueButton> */}

                  <BlueButton onClick={deployContract}>
                    Deploy Universe
                  </BlueButton>

                  {deployedContractAddress && (
                    <>
                      <BlueButton onClick={navigateToGame}>
                        Open Game
                      </BlueButton>
                      <BlueButton onClick={copyToClipboard}>
                        Copy Link
                      </BlueButton>
                    </>
                  )}
                </ButtonContainer>
              </>
            ) : (
              <div
                style={{
                  padding: "40px 20px",
                  color: "#888",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "18px", color: "#00ADE1" }}>
                  ⚠️ Account Required
                </div>
                <div>
                  {!isGameManagerInitialized && initState === InitState.COMPLETE
                    ? "Initializing game manager. Please wait..."
                    : "Please complete the account setup in the terminal above to access game configuration."}
                </div>
              </div>
            )}
          </ConfigPanelContent>
        </ConfigPanelContainer>

        <AdminPanelContainer $isOpen={isAdminOpen}>
          <ConfigHeader onClick={toggleAdminPanel} $isOpen={isAdminOpen}>
            <HeaderTitle>Admin Panel</HeaderTitle>
            <CollapseIcon $isOpen={isAdminOpen}>▼</CollapseIcon>
          </ConfigHeader>

          <ConfigPanelContent $isOpen={isAdminOpen}>
            {initState === InitState.COMPLETE && isGameManagerInitialized ? (
              <div style={{ padding: "20px" }}>
                <AdminInfoContainer>
                  <SectionTitle>Admin Account Information</SectionTitle>
                  <div style={{ marginBottom: "5px" }}>
                    <span style={{ marginRight: "10px", color: "#888" }}>
                      Address:
                    </span>
                    <span>
                      {EthereumAccountManager.getInstance().getAddress()}
                    </span>
                  </div>
                  <div style={{ marginBottom: "5px" }}>
                    <span style={{ marginRight: "10px", color: "#888" }}>
                      Balance:
                    </span>
                    <span style={{ color: "#00ADE1" }}>{adminBalance} ETH</span>
                  </div>
                  <div style={{ marginBottom: "5px" }}>
                    <span style={{ marginRight: "10px", color: "#888" }}>
                      Game Link:
                    </span>
                    <span>
                      {deployedContractAddress
                        ? `${window.location.origin}/game1/${deployedContractAddress}`
                        : "No game deployed yet"}
                    </span>
                  </div>
                </AdminInfoContainer>

                <Divider />

                <SectionTitle>Account Management</SectionTitle>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  <BlueButton
                    onClick={generateGameAccounts}
                    style={{
                      opacity: isGeneratingAccounts ? 0.5 : 1,
                      pointerEvents: isGeneratingAccounts
                        ? "none"
                        : ("auto" as any),
                    }}
                  >
                    {isGeneratingAccounts
                      ? "Generating..."
                      : "Generate 6 Accounts"}
                  </BlueButton>
                  <BlueButton
                    onClick={saveAccountsToFile}
                    style={{
                      opacity:
                        isSavingAccounts || gameAccounts.length === 0 ? 0.5 : 1,
                      pointerEvents:
                        isSavingAccounts || gameAccounts.length === 0
                          ? "none"
                          : ("auto" as any),
                    }}
                  >
                    {isSavingAccounts ? "Saving..." : "Save Accounts to File"}
                  </BlueButton>
                </div>

                <Divider />

                <SectionTitle>Batch Transfer</SectionTitle>
                <div style={{ marginBottom: "15px" }}>
                  <div
                    style={{
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ marginRight: "10px", color: "#888" }}>
                      Amount to transfer:
                    </span>
                    <StyledInput
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      step="0.001"
                      min="0"
                    />
                    <span style={{ color: "#888" }}>ETH</span>
                    <BlueButton
                      onClick={transferToAllAccounts}
                      style={{
                        marginLeft: "15px",
                        opacity:
                          isTransferringToAll ||
                          gameAccounts.length === 0 ||
                          !deployedContractAddress
                            ? 0.5
                            : 1,
                        pointerEvents:
                          isTransferringToAll ||
                          gameAccounts.length === 0 ||
                          !deployedContractAddress
                            ? "none"
                            : ("auto" as any),
                      }}
                    >
                      {isTransferringToAll
                        ? "Transferring..."
                        : "Transfer to All"}
                    </BlueButton>
                  </div>
                </div>

                {gameAccounts.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      maxHeight: "calc(100vh - 350px)",
                      overflowY: "auto",
                    }}
                  >
                    {gameAccounts.map((account, index) => (
                      <div
                        key={account.address}
                        style={{
                          background: "rgba(0, 173, 225, 0.1)",
                          border: "1px solid #00ADE1",
                          borderRadius: "4px",
                          padding: "12px 15px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "15px",
                            color: "#888",
                          }}
                        >
                          <span>Account {index + 1}</span>
                          <span style={{ color: "#00ADE1" }}>
                            Balance: {account.balance} ETH
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                          }}
                        >
                          <BlueButton
                            onClick={() =>
                              copyToClipboardWithMessage(
                                account.address,
                                `Address copied for Account ${index + 1}`
                              )
                            }
                          >
                            Public Key
                          </BlueButton>
                          <BlueButton
                            onClick={() =>
                              copyToClipboardWithMessage(
                                account.privateKey,
                                `Private key copied for Account ${index + 1}`
                              )
                            }
                          >
                            Private Key
                          </BlueButton>
                          <BlueButton
                            onClick={() =>
                              copyToClipboardWithMessage(
                                `${window.location.origin}/game1/${deployedContractAddress}?privateKey=${account.privateKey}`,
                                `Game URL with private key copied for Account ${
                                  index + 1
                                }`
                              )
                            }
                          >
                            Game URL
                          </BlueButton>
                          <BlueButton
                            onClick={() =>
                              transferFunds(account.address, index)
                            }
                            style={{
                              opacity:
                                isTransferring || !deployedContractAddress
                                  ? 0.5
                                  : 1,
                              pointerEvents:
                                isTransferring || !deployedContractAddress
                                  ? "none"
                                  : ("auto" as any),
                            }}
                          >
                            Transfer
                          </BlueButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: "40px 20px",
                  color: "#888",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "18px", color: "#00ADE1" }}>
                  ⚠️ Account Required
                </div>
                <div>
                  {!isGameManagerInitialized && initState === InitState.COMPLETE
                    ? "Initializing game manager. Please wait..."
                    : "Please complete the account setup in the terminal above to access admin features."}
                </div>
              </div>
            )}
          </ConfigPanelContent>
        </AdminPanelContainer>
      </PageLayout>
    </Wrapper>
  );
}

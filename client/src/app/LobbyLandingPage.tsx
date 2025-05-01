import React, { useState, useEffect, useRef } from 'react';
import GameManager from '../api/GameManager';
import GameUIManagerContext from './board/GameUIManagerContext';
import GameUIManager, { GameUIManagerEvent } from './board/GameUIManager';
import AbstractGameManager from '../api/AbstractGameManager';
import { unsupportedFeatures, Incompatibility } from '../api/BrowserChecks';
import {
    isAddressWhitelisted,
    submitWhitelistKey,
    submitInterestedEmail,
    submitPlayerEmail,
    EmailResponse,
    requestDevFaucet,
} from '../api/UtilityServerAPI';
import _ from 'lodash';
import TerminalEmitter, {
    TerminalTextStyle,
    TerminalEvent,
} from '../utils/TerminalEmitter';
import Terminal from './Terminal';
import { useHistory } from 'react-router-dom';
import ModalWindow from './ModalWindow';
import GameWindow from './GameWindow';
import {
    Wrapper,
    TerminalWrapper,
    Hidden,
    GameWindowWrapper,
    TerminalToggler,
} from './GameLandingPageComponents';
import UIEmitter, { UIEmitterEvent } from '../utils/UIEmitter';
import { utils, Wallet } from 'ethers';
import EthereumAccountManager from '../api/EthConnection';
import { address } from '../utils/CheckedTypeUtils';
import { UIDataKey, useStoredUIState } from '../api/UIStateStorageManager';
import TutorialManager, { TutorialState } from '../utils/TutorialManager';
import { TerminalPromptType } from '../_types/darkforest/app/board/utils/TerminalTypes';
import { BLOCK_EXPLORER_URL } from '../utils/constants';
import styled from 'styled-components';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../_types/global/GlobalTypes';
import GameConfigPanel from '../components/GameConfigPanel';
import BlueButton from '../components/BlueButton';

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
  border: 2px solid #00ADE1;
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
const ConfigPanelContainer = styled.div`
  border: 2px solid #00ADE1;
  border-radius: 4px;
  margin: 10px;
  box-shadow: 0 0 10px rgba(0, 173, 225, 0.3);
  height: 63vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// Content area for the config panel
const ConfigPanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 25px;
  color: white;
`;

// Button container at the bottom of config panel
const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  border-top: 1px solid rgba(0, 173, 225, 0.3);
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


export default function LobbyLandingPage(_props: { replayMode: boolean }) {
    const history = useHistory();
    /* terminal stuff */
    const isProd = process.env.NODE_ENV === 'production';

    let initState = InitState.NONE;
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

    const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
    const [gameConfig, setGameConfig] = useState<GameConfig | undefined>(undefined);

    // Disable body scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.body.style.margin = '';
            document.body.style.padding = '';
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
        console.log('LobbyLandingPage: Enabling user input and waiting for response...');
        terminalEmitter.enableUserInput();

        const ret: string = await new Promise<string>((resolve) => {
            const handleUserInput = (input: string) => {
                console.log('LobbyLandingPage: Received user input:', input);
                resolve(input);
            };

            terminalEmitter.once(TerminalEvent.UserEnteredInput, handleUserInput);
        });

        console.log('LobbyLandingPage: User input received, disabling input field:', ret);
        terminalEmitter.disableUserInput();

        return ret.trim();
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const animEllipsis = async () => {
        const terminalEmitter = TerminalEmitter.getInstance();
        const delay = 0; // TODOPR 250
        for (const _i in _.range(3)) {
            await wait(delay).then(() => terminalEmitter.print('.'));
        }
        await wait(delay * 1.5);
        return;
    };

    const advanceStateFromNone = async () => {
        const terminalEmitter = TerminalEmitter.getInstance();
        if (!isProd) {
            terminalEmitter.emit(TerminalEvent.SkipAllTyping);
        }

        const lastUpdated = localStorage.getItem('lastUpdated');
        if (lastUpdated) {
            const diff = Date.now() - parseInt(lastUpdated);
            // 10 min
            if (diff < 1000 * 60 * 10)
                terminalEmitter.emit(TerminalEvent.SkipAllTyping);
        }

        terminalEmitter.println('Initializing Dark Forest...');
        terminalEmitter.println('Connecting to blockchain...');
        await animEllipsis();
        terminalEmitter.println('Connected to xDAI STAKE.', TerminalTextStyle.Blue);
        terminalEmitter.newline();

        // Skip compatibility checks
        terminalEmitter.println('All systems ready.', TerminalTextStyle.Green);
        terminalEmitter.newline();
        initState = InitState.COMPATIBILITY_CHECKS_PASSED;
    };

    const advanceStateFromCompatibilityPassed = async () => {
        const terminalEmitter = TerminalEmitter.getInstance();

        terminalEmitter.println('Dark Forest v0.4');
        terminalEmitter.newline();

        const knownAddrs = EthereumAccountManager.getInstance().getKnownAccounts();
        console.log('LobbyLandingPage: Found accounts:', knownAddrs);
        terminalEmitter.println(
            `Found ${knownAddrs.length} accounts on this device.`
        );
        if (knownAddrs.length > 0) {
            terminalEmitter.println('(a) Login with existing account.');
        }
        terminalEmitter.println(`(n) Generate new burner wallet account.`);
        terminalEmitter.println(`(i) Import private key.`);
        terminalEmitter.println(`Select an option.`, TerminalTextStyle.White);

        const userInput = await getUserInput();
        console.log('LobbyLandingPage: User selected option:', userInput);

        if (userInput.toLowerCase() === 'a') {
            initState = InitState.DISPLAY_ACCOUNTS;
        } else if (userInput.toLowerCase() === 'n') {
            initState = InitState.GENERATE_ACCOUNT;
        } else if (userInput.toLowerCase() === 'i') {
            initState = InitState.IMPORT_ACCOUNT;
        } else {
            terminalEmitter.println(`Unrecognized input: '${userInput}'. Please try again.`);
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
            terminalEmitter.println('Unrecognized input. Please try again.');
        } else {
            const addr = knownAddrs[selection - 1];
            try {
                ethConnection.setAccount(addr);
                initState = InitState.ACCOUNT_SET;
            } catch (e) {
                terminalEmitter.println(
                    'An unknown error occurred. please try again.',
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
                'NOTE: BURNER WALLETS ARE STORED IN BROWSER LOCAL STORAGE.',
                TerminalTextStyle.White
            );
            terminalEmitter.println(
                'They are relatively insecure and you should avoid storing substantial funds in them.'
            );
            terminalEmitter.println(
                'Press any key to continue.',
                TerminalTextStyle.White
            );

            await getUserInput();
            initState = InitState.ACCOUNT_SET;
        } catch (e) {
            terminalEmitter.println(
                'An unknown error occurred. please try again.',
                TerminalTextStyle.Red
            );
        }
    };

    const advanceStateFromImportAccount = async () => {
        const terminalEmitter = TerminalEmitter.getInstance();
        const ethConnection = EthereumAccountManager.getInstance();

        terminalEmitter.println(
            'Enter the 0x-prefixed private key of the account you wish to import',
            TerminalTextStyle.White
        );
        terminalEmitter.println(
            "NOTE: THIS WILL STORE THE PRIVATE KEY IN YOUR BROWSER'S LOCAL STORAGE",
            TerminalTextStyle.White
        );
        terminalEmitter.println(
            'Local storage is relatively insecure. We recommend only importing accounts with zero-to-no funds.'
        );
        const newSKey = await getUserInput();
        try {
            const newAddr = address(utils.computeAddress(newSKey));
            ethConnection.addAccount(newSKey);
            ethConnection.setAccount(newAddr);
            terminalEmitter.println(`Imported account with address ${newAddr}.`);
            initState = InitState.ACCOUNT_SET;
        } catch (e) {
            terminalEmitter.println(
                'An unknown error occurred. please try again.',
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

        terminalEmitter.println('Account selected successfully.', TerminalTextStyle.Green);
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
                const privateKey = ethConnection.getPrivateKey();
                navigator.clipboard.writeText(privateKey);
                terminalEmitter.println(
                    '\nPrivate key copied to clipboard!',
                    TerminalTextStyle.Green
                );
            },
            TerminalTextStyle.Blue
        );
        terminalEmitter.println(' ]', TerminalTextStyle.Sub);

        terminalEmitter.println('\nAccount setup complete. You can now configure and deploy a game.', TerminalTextStyle.Green);
        initState = InitState.COMPLETE;
        setInitRenderState(InitRenderState.COMPLETE);
    };

    const getGameLink = (contractAddress: string): string => {
        return `${window.location.origin}/game1/${contractAddress}`;
    };

    const deployContract = async () => {
        const terminalEmitter = TerminalEmitter.getInstance();

        // Check if GameUIManager is initialized
        if (!gameUIManagerRef.current) {
            terminalEmitter.println('Game manager not initialized. Please wait...', TerminalTextStyle.Red);

            try {
                const newGameManager: AbstractGameManager = await GameManager.create();
                window.df = newGameManager;
                const newGameUIManager = GameUIManager.create(newGameManager);
                window.uiManager = newGameUIManager;
                gameUIManagerRef.current = newGameUIManager;
                terminalEmitter.println('Game manager initialized.', TerminalTextStyle.Green);
            } catch (error) {
                console.error('Failed to initialize game manager:', error);
                terminalEmitter.println('Failed to initialize game manager. See console for details.', TerminalTextStyle.Red);
                return;
            }
        }

        // Check if game config is set
        if (!gameConfig) {
            terminalEmitter.println('Game configuration not set. Using default configuration.', TerminalTextStyle.Blue);
            setGameConfig(DEFAULT_GAME_CONFIG);
            await wait(500); // Simple delay to ensure state is updated
        }

        terminalEmitter.println('Deploying contract... Please confirm transaction in your wallet', TerminalTextStyle.White);

        try {
            const contractAddress = await gameUIManagerRef.current.deployContract(gameConfig);
            console.log('Contract deployed successfully:', contractAddress);

            setDeployedContractAddress(contractAddress);

            terminalEmitter.println('Contract address: ' + contractAddress, TerminalTextStyle.White);
            terminalEmitter.println('Contract deployed successfully!', TerminalTextStyle.Green);

            // Generate and display game link in terminal
            const gameLink = getGameLink(contractAddress);
            terminalEmitter.println('');
            terminalEmitter.println('Game link created:', TerminalTextStyle.Sub);
            terminalEmitter.printLink(gameLink, () => window.open(gameLink, '_blank'), TerminalTextStyle.Blue);
            terminalEmitter.println('');
            terminalEmitter.println('Click the link above or use the "Open Game" button to start playing!', TerminalTextStyle.White);
        } catch (error) {
            console.error('Contract deployment failed:', error);
            terminalEmitter.println(`Contract deployment failed: ${error.message || 'Unknown error'}`, TerminalTextStyle.Red);

            // More detailed error display
            if (error.message && error.message.includes('library')) {
                terminalEmitter.println('This may be due to missing library addresses. Check that local_library_addrs.ts is properly configured.', TerminalTextStyle.Red);
            } else if (error.message && error.message.includes('user denied')) {
                terminalEmitter.println('Transaction was rejected in your wallet. Please try again.', TerminalTextStyle.Blue);
            } else if (error.message && error.message.includes('unknown account')) {
                terminalEmitter.println('No wallet account found. Please make sure your account is properly set up.', TerminalTextStyle.Red);
                terminalEmitter.println('Try refreshing the page and going through the account setup again.', TerminalTextStyle.Blue);
            } else if (error.message && error.message.includes('zero balance')) {
                terminalEmitter.println('Your account has no tokens. You need some to deploy a contract.', TerminalTextStyle.Red);
                terminalEmitter.println('For local development, make sure your local blockchain has funds in your account.', TerminalTextStyle.Blue);
            }
        }
    };

    const navigateToGame = () => {
        if (deployedContractAddress) {
            window.open(getGameLink(deployedContractAddress), '_blank');
        }
    };

    const copyToClipboard = () => {
        if (deployedContractAddress) {
            const gameLink = getGameLink(deployedContractAddress);
            navigator.clipboard.writeText(gameLink);

            const terminalEmitter = TerminalEmitter.getInstance();
            terminalEmitter.println('Game link copied to clipboard!', TerminalTextStyle.Green);
        }
    };

    const handleSaveSettings = (config: GameConfig) => {
        setGameConfig(config);
    };

    const resetSettings = () => {
        setGameConfig(DEFAULT_GAME_CONFIG);
        const terminalEmitter = TerminalEmitter.getInstance();
        terminalEmitter.println('Settings reset to defaults.', TerminalTextStyle.Green);
    };

    const printGameConfig = () => {

        console.log(JSON.stringify(gameConfig, null, 2));
    };

    const advanceState = async () => {
        try {
            console.log('LobbyLandingPage: Current init state:', initState);

            if (initState === InitState.NONE) {
                await advanceStateFromNone();
                setTimeout(() => advanceState(), 0);
            } else if (initState === InitState.COMPATIBILITY_CHECKS_PASSED) {
                await advanceStateFromCompatibilityPassed();
                setTimeout(() => advanceState(), 0);
            } else if (initState === InitState.DISPLAY_ACCOUNTS) {
                await advanceStateFromDisplayAccounts();
                setTimeout(() => advanceState(), 0);
            } else if (initState === InitState.GENERATE_ACCOUNT) {
                await advanceStateFromGenerateAccount();
                setTimeout(() => advanceState(), 0);
            } else if (initState === InitState.IMPORT_ACCOUNT) {
                await advanceStateFromImportAccount();
                setTimeout(() => advanceState(), 0);
            } else if (initState === InitState.ACCOUNT_SET) {
                await advanceStateFromAccountSet();
                // Terminal flow ends here with account setup
            }

            console.log('LobbyLandingPage: After processing, state is now:', initState);
        } catch (error) {
            console.error('LobbyLandingPage: Error in advanceState:', error);
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

    // Setup game manager when needed
    useEffect(() => {
        if (initState === InitState.COMPLETE && !gameUIManagerRef.current) {
            const setupGameManager = async () => {
                try {
                    const newGameManager: AbstractGameManager = await GameManager.create();
                    window.df = newGameManager;
                    const newGameUIManager = GameUIManager.create(newGameManager);
                    window.uiManager = newGameUIManager;
                    gameUIManagerRef.current = newGameUIManager;

                    // Initialize game config if not set
                    if (!gameConfig) {
                        setGameConfig(DEFAULT_GAME_CONFIG);
                    }

                    const terminalEmitter = TerminalEmitter.getInstance();
                    terminalEmitter.println('Game manager initialized successfully.', TerminalTextStyle.Green);
                } catch (error) {
                    console.error('Failed to initialize game manager:', error);
                    const terminalEmitter = TerminalEmitter.getInstance();
                    terminalEmitter.println('Failed to initialize game manager. See console for details.', TerminalTextStyle.Red);
                }
            };

            setupGameManager();
        }
    }, [initState, gameConfig]);

    return (
        <Wrapper initRender={initRenderState} terminalEnabled={terminalEnabled}>
            {modal === ModalState.GAS_PRICES && (
                <ModalWindow close={modalClose}>
                    <img
                        style={{ margin: '0 auto' }}
                        src={'/public/img/toodamnhigh.jpg'}
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
                <ConfigPanelContainer>
                    {/* Configuration panel content area - replace placeholder with GameConfigPanel */}
                    <ConfigPanelContent>
                        <GameConfigPanel
                            onSaveConfig={handleSaveSettings}
                            initialConfig={gameConfig}
                        />
                    </ConfigPanelContent>

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
                </ConfigPanelContainer>
            </PageLayout>
        </Wrapper>
    );
}

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import GameUIManager from '../app/board/GameUIManager';
import { contractAddress } from '../utils/local_contract_addr';
import { EthAddress } from '../_types/global/GlobalTypes';

export enum UIDataKey {
  terminalEnabled = 'terminalEnabled',
  sidebarEnabled = 'sidebarEnabled',
  tutorialCompleted = 'tutorialCompleted',

  welcomedPlayer = 'welcomedPlayer',
  foundSpace = 'foundSpace',
  foundDeepSpace = 'foundDeepSpace',
  foundPirates = 'foundPirates',
  foundSilver = 'foundSilver',
  foundComet = 'foundComet',
  foundArtifact = 'foundArtifact',

  notifMove = 'notifMove',
  newPlayer = 'newPlayer',
  highPerf = 'highPerf',

  shouldFling = 'shouldFling',

  /**
   * Whether or not `PluginManager` has added the default plugins to
   * this user's plugin library. We need to keep track of this so
   * that we only do it the first time that the plugins UI is opened.
   */
  hasAddedDefaultPlugins = 'hasAddedReadme',

  /**
   * Same as above, except for a plugin that shows off a brand new
   * plugin capability - drawing on top of the game
   */
  hasAddedCanvasPlugin = 'hasAddedCanvasPlugin',

  /**
   * Has this use acknowledged the fact that downloading and running
   * plugins from the internet is dangerous?
   */
  hasAcceptedPluginRisk = 'hasAcceptedPluginRisk',
}

export type UIDataValue = boolean;

export type UIData = {
  sidebarEnabled: boolean;
  terminalEnabled: boolean;
  tutorialCompleted: boolean;

  welcomedPlayer: boolean;
  foundSpace: boolean;
  foundDeepSpace: boolean;
  foundPirates: boolean;
  foundSilver: boolean;
  foundComet: boolean;
  foundArtifact: boolean;

  notifMove: boolean;
  newPlayer: boolean;
  highPerf: boolean;

  hasAddedReadme: boolean;
  hasAddedCanvasPlugin: boolean;
  hasAcceptedPluginRisk: boolean;
  shouldFling: boolean;
};

export const defaultUserData: UIData = {
  terminalEnabled: true,
  sidebarEnabled: true,
  tutorialCompleted: false,

  welcomedPlayer: false,
  foundSpace: false,
  foundDeepSpace: false,
  foundPirates: false,
  foundSilver: false,
  foundComet: false,
  foundArtifact: false,

  notifMove: true,
  newPlayer: true,

  highPerf: false,
  hasAddedReadme: false,
  hasAddedCanvasPlugin: false,
  hasAcceptedPluginRisk: false,
  shouldFling: false,
};

export function useStoredUIState<T extends UIDataValue>(
  key: UIDataKey,
  gameUIManager: GameUIManager | null
): [T, Dispatch<SetStateAction<T>>] {
  const hook = useState<T>(defaultUserData[key] as T);
  const [value, setValue] = hook;

  // sync value to storage
  useEffect(() => {
    if (!gameUIManager) return;
    const stored = gameUIManager.getUIDataItem(key);
    setValue(stored as T);
  }, [gameUIManager, key, setValue]);

  // now sync state updates to storage
  useEffect(() => {
    if (!gameUIManager) return;
    gameUIManager.setUIDataItem(key, value);
  }, [value, gameUIManager, key]);

  return hook;
}

// singleton who should never be initialized before gameUIManager
class UIStateStorageManager {
  private static instance: UIStateStorageManager;
  account: EthAddress | null;
  contractAddress: string;

  private constructor(account: EthAddress | null, contractAddress: string) {
    this.account = account;
    this.contractAddress = contractAddress;
  }

  public static create(
    account: EthAddress | null,
    contractAddress: string
  ): UIStateStorageManager {
    UIStateStorageManager.instance = new UIStateStorageManager(
      account,
      contractAddress
    );
    return UIStateStorageManager.instance;
  }

  // TODO implement this
  public destroy(): void {
    // in the future we can use this for things that are polled like viewport
    // this.save();

    // don't need to do anything else
    return;
  }

  private getKey(): string {
    if (!this.account) return 'user-data';
    return `${this.account}-${contractAddress}-data`;
  }

  // manage user data
  private save(data: UIData) {
    localStorage.setItem(this.getKey(), JSON.stringify(data));
  }

  private load(): UIData {
    const str = localStorage.getItem(this.getKey());

    if (str) return JSON.parse(str);
    else {
      // default values
      return defaultUserData;
    }
  }

  setUIDataItem(key: UIDataKey, value: UIDataValue): void {
    const obj = this.load();
    obj[key] = value;
    this.save(obj);
  }

  getUIDataItem(key: UIDataKey): UIDataValue {
    const val = this.load()[key];
    return val;
  }
}

export default UIStateStorageManager;

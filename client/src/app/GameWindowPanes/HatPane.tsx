import React, { useContext, useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import { Sub } from '../../components/Text';
import { HAT_SIZES, TOKEN_NAME } from '../../utils/constants';
import { ProcgenUtils } from '../../utils/ProcgenUtils';
import UIEmitter, { UIEmitterEvent } from '../../utils/UIEmitter';
import { EthAddress, Planet } from '../../_types/global/GlobalTypes';
import GameUIManager from '../board/GameUIManager';
import GameUIManagerContext from '../board/GameUIManagerContext';
import {
  AccountContext,
  ContextMenuType,
  SelectedContext,
} from '../GameWindow';
import { Btn } from '../GameWindowComponents/GameWindowComponents';
import { ModalHook, ModalName, ModalPane } from './ModalPane';

const StyledHatPane = styled.div`
  height: fit-content;
  width: 20em;

  & > div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    &:last-child > span {
      margin-top: 1em;
      text-align: center;
      flex-grow: 1;
    }

    &.margin-top {
      margin-top: 0.5em;
    }
  }
`;

// NOTE: Fix the issue where the selected planet was not updated in time in the future


export function HatPane({ hook }: { hook: ModalHook }) {
  const selected = useContext<Planet | null>(SelectedContext);
  const uiManager = useContext<GameUIManager | null>(GameUIManagerContext);

  const [balance, setBalance] = useState<number>(0);
  const [visible, setVisible] = hook;
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Get latest planet data
  const getLatestSelectedPlanet = (): Planet | null => {
    if (!uiManager || !selected) return null;
    return uiManager.getPlanetWithId(selected.locationId) || selected;
  };

  // Refresh HatPane every 1 second
  useEffect(() => {
    if (!visible) return;

    const refreshInterval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [visible]);

  useEffect(() => {
    if (!uiManager) return;
    const updateBalance = () => {
      if (visible) {
        setBalance(uiManager.getMyBalance());
      }
    };

    updateBalance();
    const intervalId = setInterval(updateBalance, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [uiManager, visible, selected, refreshKey]);

  useEffect(() => {
    const doChange = (type: ContextMenuType) => {
      if (type === ContextMenuType.None) {
        setVisible(false);
      }
    };
    const uiEmitter = UIEmitter.getInstance();
    uiEmitter.on(UIEmitterEvent.ContextChange, doChange);

    const hide = () => setVisible(false);
    uiEmitter.on(UIEmitterEvent.GamePlanetSelected, hide);

    return () => {
      uiEmitter.removeListener(UIEmitterEvent.ContextChange, doChange);
      uiEmitter.removeListener(UIEmitterEvent.GamePlanetSelected, hide);
    };
  }, []);

  // Use latest planet data
  const latestSelected = getLatestSelectedPlanet();

  const getCost = () => {
    return latestSelected ? 2 ** latestSelected.hatLevel * 0.001 : 1 * 0.001;
  };

  const hatUpgradePending = (): boolean => {
    if (!latestSelected) return true;
    if (!latestSelected.unconfirmedBuyHats) return false;
    return latestSelected.unconfirmedBuyHats.length > 0;
  };

  const account = useContext<EthAddress | null>(AccountContext);

  const enabled = (): boolean =>
    !hatUpgradePending() && latestSelected?.owner === account && balance > getCost();

  return (
    <ModalPane hook={hook} title={'Planet HATs'} name={ModalName.Hats}>
      <StyledHatPane>
        <div>
          <Sub>HAT</Sub>
          <span>{ProcgenUtils.getPlanetCosmetic(latestSelected).hatType}</span>
        </div>
        <div>
          <Sub>HAT Level</Sub>
          <span>{HAT_SIZES[latestSelected ? latestSelected.hatLevel : 0]}</span>
        </div>
        <div className='margin-top'>
          <Sub>Next Level Cost</Sub>
          <span>
            {getCost()} {TOKEN_NAME}
          </span>
        </div>
        <div>
          <Sub>Current Balance</Sub>
          <span>{balance} {TOKEN_NAME}</span>
        </div>
        <div>
          <a onClick={() => window.open('https://blog.zkga.me/df-04-faq')}>
            <u>Get More {TOKEN_NAME}</u>
          </a>
        </div>
        <div>
          <Btn
            onClick={() => {
              if (!enabled() || !uiManager || !latestSelected) return;
              uiManager.buyHat(latestSelected);
            }}
            className={!enabled() ? 'btn-disabled' : ''}
          >
            {latestSelected && latestSelected.hatLevel > 0 ? 'Upgrade' : 'Buy'} HAT
          </Btn>
        </div>
      </StyledHatPane>
    </ModalPane>
  );
}

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../_types/global/GlobalTypes';
import BlueButton from './BlueButton';

// Panel styles
const ConfigContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  color: white;
  padding-right: 8px;
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 173, 225, 0.05);
  }
  &::-webkit-scrollbar-thumb {
    background: #00ADE1;
    border-radius: 2px;
  }
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #00ADE1 rgba(0, 173, 225, 0.05);
`;

const ConfigSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  color: #00ADE1;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(0, 173, 225, 0.3);
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ConfigItem = styled.div`
  margin-bottom: 10px;
`;

const ConfigLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #E0E0E0;
`;

const ConfigInput = styled.input`
  width: 100%;
  padding: 8px;
  background-color: #1A1A1A;
  border: 1px solid #333333;
  border-radius: 4px;
  color: white;
  font-family: 'Inconsolata', monospace;
  
  &:focus {
    outline: none;
    border-color: #00ADE1;
  }
`;

const ConfigCheckbox = styled.input`
  margin-right: 8px;
`;

const ConfigSelect = styled.select`
  width: 100%;
  padding: 8px;
  background-color: #1A1A1A;
  border: 1px solid #333333;
  border-radius: 4px;
  color: white;
  
  &:focus {
    outline: none;
    border-color: #00ADE1;
  }
`;

const ConfigDescription = styled.div`
  font-size: 12px;
  color: #888888;
  margin-top: 3px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

// Help text object, describes each configuration option
const configHelp = {
    adminAddress: "Admin wallet address - controls the game",
    whitelistEnabled: "Enable whitelist for game access",
    paused: "Pause the game",
    DISABLE_ZK_CHECK: "Disable zero-knowledge proofs verification (for testing only)",
    TIME_FACTOR_HUNDREDTHS: "Game speed factor (percentage)",
    PERLIN_THRESHOLD_1: "First Perlin noise threshold for space type",
    PERLIN_THRESHOLD_2: "Second Perlin noise threshold for space type",
    PLANET_RARITY: "Planet rarity, higher means fewer planets",
    SILVER_RARITY_1: "First silver rarity value",
    SILVER_RARITY_2: "Second silver rarity value",
    SILVER_RARITY_3: "Third silver rarity value",
    planetLevelThresholds: "Planet level thresholds",
    gameEndTimestamp: "Game end timestamp (Unix time)",
    target4RadiusConstant: "Target 4 radius constant",
    target5RadiusConstant: "Target 5 radius constant",
    BIOME_THRESHOLD_1: "First biome threshold",
    BIOME_THRESHOLD_2: "Second biome threshold",
    ARTIFACT_LOCKUP_DURATION_SECONDS: "Artifact lockup duration (seconds)"
};

interface GameConfigPanelProps {
    onSaveConfig: (config: GameConfig) => void;
    initialConfig?: GameConfig;
}

const GameConfigPanel: React.FC<GameConfigPanelProps> = ({ onSaveConfig, initialConfig }) => {
    // Initialize with initialConfig or DEFAULT_GAME_CONFIG but ensure admin settings use defaults
    const getInitialConfig = () => {
        if (initialConfig) {
            return {
                ...initialConfig,
                // Always use default admin settings
                adminAddress: DEFAULT_GAME_CONFIG.adminAddress,
                whitelistEnabled: DEFAULT_GAME_CONFIG.whitelistEnabled,
                paused: DEFAULT_GAME_CONFIG.paused,
                // Always use default for ZK checks (should be false)
                DISABLE_ZK_CHECK: DEFAULT_GAME_CONFIG.DISABLE_ZK_CHECK
            };
        }
        return DEFAULT_GAME_CONFIG;
    };

    const [config, setConfig] = useState<GameConfig>(getInitialConfig());

    // Update state when initial config changes
    useEffect(() => {
        if (initialConfig) {
            setConfig({
                ...initialConfig,
                // Always use default admin settings
                adminAddress: DEFAULT_GAME_CONFIG.adminAddress,
                whitelistEnabled: DEFAULT_GAME_CONFIG.whitelistEnabled,
                paused: DEFAULT_GAME_CONFIG.paused,
                // Always use default for ZK checks (should be false)
                DISABLE_ZK_CHECK: DEFAULT_GAME_CONFIG.DISABLE_ZK_CHECK
            });
        }
    }, [initialConfig]);

    // Auto-save config whenever it changes
    useEffect(() => {
        // Use a small delay to avoid too frequent updates
        const timeoutId = setTimeout(() => {
            onSaveConfig(config);
        }, 500);

        // Cleanup timeout on component unmount or config change
        return () => clearTimeout(timeoutId);
    }, [config, onSaveConfig]);

    // Handle input changes
    const handleChange = (key: keyof GameConfig, value: any) => {
        // Don't allow changing admin settings or ZK checks
        if (key === 'adminAddress' || key === 'whitelistEnabled' || key === 'paused' || key === 'DISABLE_ZK_CHECK') {
            return;
        }

        setConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Handle number input
    const handleNumberChange = (key: keyof GameConfig, value: string) => {
        const numValue = value === '' ? 0 : Number(value);
        handleChange(key, numValue);
    };

    // Handle boolean toggle
    const handleBooleanChange = (key: keyof GameConfig, checked: boolean) => {
        handleChange(key, checked);
    };

    // Handle array input
    const handleArrayChange = (key: keyof GameConfig, index: number, value: string) => {
        const arrayValue = [...(config[key] as number[])];
        arrayValue[index] = value === '' ? 0 : Number(value);
        handleChange(key, arrayValue);
    };

    // Create Unix timestamp for time periods
    const getTimestampForDays = (days: number): number => {
        const now = new Date();
        now.setDate(now.getDate() + days);
        return Math.floor(now.getTime() / 1000);
    };

    const getTimestampForYears = (years: number): number => {
        const now = new Date();
        now.setFullYear(now.getFullYear() + years);
        return Math.floor(now.getTime() / 1000);
    };

    // Update game end time to specific time periods
    const setEndTimeFor30Days = () => {
        handleChange('gameEndTimestamp', getTimestampForDays(30));
    };

    const setEndTimeFor1Year = () => {
        handleChange('gameEndTimestamp', getTimestampForYears(1));
    };

    // Add a function to format date and time display
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    };

    // Format seconds into human readable duration string
    const formatSeconds = (seconds: number): string => {
        if (seconds <= 0) return '0 seconds';
        
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        const remainingSeconds = seconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
        if (remainingSeconds > 0) parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`);

        return parts.join(' ');
    };

    // Functions to set duration for half day and one day
    const setDurationForHalfDay = () => {
        const halfDayInSeconds = 12 * 60 * 60; // Number of seconds in 12 hours
        handleChange('ARTIFACT_LOCKUP_DURATION_SECONDS', halfDayInSeconds);
    };

    const setDurationForOneDay = () => {
        const oneDayInSeconds = 24 * 60 * 60; // Number of seconds in 24 hours
        handleChange('ARTIFACT_LOCKUP_DURATION_SECONDS', oneDayInSeconds);
    };

    return (
        <ConfigContainer>
            <ConfigSection>
                <SectionTitle>Game Mechanics</SectionTitle>
                <ConfigGrid>
                    <ConfigItem>
                        <ConfigLabel>Time Factor (hundredths)</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.TIME_FACTOR_HUNDREDTHS}
                            onChange={(e) => handleNumberChange('TIME_FACTOR_HUNDREDTHS', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.TIME_FACTOR_HUNDREDTHS}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Planet Rarity</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.PLANET_RARITY}
                            onChange={(e) => handleNumberChange('PLANET_RARITY', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.PLANET_RARITY}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Perlin Threshold 1</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.PERLIN_THRESHOLD_1}
                            onChange={(e) => handleNumberChange('PERLIN_THRESHOLD_1', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.PERLIN_THRESHOLD_1}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Perlin Threshold 2</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.PERLIN_THRESHOLD_2}
                            onChange={(e) => handleNumberChange('PERLIN_THRESHOLD_2', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.PERLIN_THRESHOLD_2}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Silver Rarity 1</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.SILVER_RARITY_1}
                            onChange={(e) => handleNumberChange('SILVER_RARITY_1', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.SILVER_RARITY_1}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Silver Rarity 2</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.SILVER_RARITY_2}
                            onChange={(e) => handleNumberChange('SILVER_RARITY_2', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.SILVER_RARITY_2}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Silver Rarity 3</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.SILVER_RARITY_3}
                            onChange={(e) => handleNumberChange('SILVER_RARITY_3', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.SILVER_RARITY_3}</ConfigDescription>
                    </ConfigItem>
                    <ConfigItem>
                        <ConfigLabel>Biome Threshold 1</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.BIOME_THRESHOLD_1}
                            onChange={(e) => handleNumberChange('BIOME_THRESHOLD_1', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.BIOME_THRESHOLD_1}</ConfigDescription>
                    </ConfigItem>
                    <ConfigItem>
                        <ConfigLabel>Biome Threshold 2</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.BIOME_THRESHOLD_2}
                            onChange={(e) => handleNumberChange('BIOME_THRESHOLD_2', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.BIOME_THRESHOLD_2}</ConfigDescription>
                    </ConfigItem>
                    <ConfigItem>
                        <ConfigLabel>Artifact Lockup Duration</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.ARTIFACT_LOCKUP_DURATION_SECONDS}
                            onChange={(e) => handleNumberChange('ARTIFACT_LOCKUP_DURATION_SECONDS', e.target.value)}
                        />
                        <ConfigDescription>
                            {configHelp.ARTIFACT_LOCKUP_DURATION_SECONDS}
                            <div style={{ marginTop: '4px', color: '#00ADE1' }}>
                                Duration: {formatSeconds(config.ARTIFACT_LOCKUP_DURATION_SECONDS)}
                            </div>
                            <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                                <BlueButton
                                    style={{ padding: '2px 5px', fontSize: '12px' }}
                                    onClick={setDurationForHalfDay}
                                >
                                    Set to half day
                                </BlueButton>
                                <BlueButton
                                    style={{ padding: '2px 5px', fontSize: '12px' }}
                                    onClick={setDurationForOneDay}
                                >
                                    Set to one day
                                </BlueButton>
                            </div>
                        </ConfigDescription>
                    </ConfigItem>
                </ConfigGrid>
            </ConfigSection>

            <ConfigSection>
                <SectionTitle>Planet Configuration</SectionTitle>
                <ConfigGrid>
                    {config.planetLevelThresholds.map((value, index) => (
                        <ConfigItem key={`level-${index}`}>
                            <ConfigLabel>Planet Level Threshold {index + 1}</ConfigLabel>
                            <ConfigInput
                                type="number"
                                value={value}
                                onChange={(e) => handleArrayChange('planetLevelThresholds', index, e.target.value)}
                            />
                        </ConfigItem>
                    ))}
                </ConfigGrid>
            </ConfigSection>

            <ConfigSection>
                <SectionTitle>Game Timing and Radius Constants</SectionTitle>
                <ConfigGrid>
                    <ConfigItem>
                        <ConfigLabel>Game End Timestamp</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.gameEndTimestamp}
                            onChange={(e) => handleNumberChange('gameEndTimestamp', e.target.value)}
                        />
                        <ConfigDescription>
                            {configHelp.gameEndTimestamp}
                            <div style={{ marginTop: '4px', color: '#00ADE1' }}>
                                End Date: {formatDate(config.gameEndTimestamp)}
                            </div>
                            <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                                <BlueButton
                                    style={{ padding: '2px 5px', fontSize: '12px' }}
                                    onClick={setEndTimeFor30Days}
                                >
                                    Set to 30 days
                                </BlueButton>
                                <BlueButton
                                    style={{ padding: '2px 5px', fontSize: '12px' }}
                                    onClick={setEndTimeFor1Year}
                                >
                                    Set to 1 year
                                </BlueButton>
                            </div>
                        </ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Target 4 Radius Constant</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.target4RadiusConstant}
                            onChange={(e) => handleNumberChange('target4RadiusConstant', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.target4RadiusConstant}</ConfigDescription>
                    </ConfigItem>

                    <ConfigItem>
                        <ConfigLabel>Target 5 Radius Constant</ConfigLabel>
                        <ConfigInput
                            type="number"
                            value={config.target5RadiusConstant}
                            onChange={(e) => handleNumberChange('target5RadiusConstant', e.target.value)}
                        />
                        <ConfigDescription>{configHelp.target5RadiusConstant}</ConfigDescription>
                    </ConfigItem>
                </ConfigGrid>
            </ConfigSection>

        </ConfigContainer>
    );
};

export default GameConfigPanel; 
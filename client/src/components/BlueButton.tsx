import React from 'react';
import Button from './Button';
import dfstyles from '../styles/dfstyles';

interface BlueButtonProps {
    onClick?(event: React.MouseEvent<HTMLButtonElement>): Promise<void> | void;
    children: React.ReactNode;
    style?: React.CSSProperties;
}

const blueButtonStyle: React.CSSProperties = {
    backgroundColor: dfstyles.colors.dfblue,
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    margin: '10px 0',
    boxShadow: '0 2px 4px rgba(0, 173, 225, 0.3)',
    transition: 'all 0.2s ease',
    outline: 'none'
};

const blueButtonHoverStyle: React.CSSProperties = {
    backgroundColor: '#0095c8'
};

export default function BlueButton({
    children,
    onClick,
    style = {},
    ...rest
}: BlueButtonProps) {
    return (
        <Button
            onClick={onClick}
            style={{
                ...blueButtonStyle,
                ...style
            }}
            hoverStyle={blueButtonHoverStyle}
            {...rest}
        >
            {children}
        </Button>
    );
} 
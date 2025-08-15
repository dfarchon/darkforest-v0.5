import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useHistory } from 'react-router-dom';

// Flicker animation - exactly like original HTML
const flicker = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
`;

// Strong neon glow effect for titles
const neonGlow = keyframes`
  0%, 100% { 
    text-shadow: 
      0 0 5px #00ff00,
      0 0 10px #00ff00,
      0 0 15px #00ff00,
      0 0 20px #00ff00,
      0 0 25px #00ff00;
  }
`;

// Styled components
const Container = styled.div`
  background-color: #000000;
  color: #00ff00;
  font-family: "Courier New", Courier, monospace;
  text-align: left;
  padding: 50px;
  min-height: 100vh;
`;

const ContentContainer = styled.div`
  max-width: 800px;
  margin: auto;
  padding: 20px;
  text-align: left;
`;

const Title = styled.h1`
  font-size: 3em;
  margin: 0 0 20px 0;
`;

const Text = styled.p`
  font-size: 1.2em;
  line-height: 1.6;
  margin: 20px 0;
`;

const Link = styled.a`
  color: #00ffff;
  text-decoration: underline;
  font-size: 1.2em;
  cursor: pointer;
  
  &:hover {
    color: #00ff00;
  }
`;

const GameButton = styled.button`
  background: transparent;
  border: 2px solid #00ff00;
  color: #00ff00;
  font-family: "Courier New", Courier, monospace;
  font-size: 1.5em;
  padding: 15px 30px;
  margin: 30px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #00ff00;
    color: #000000;
    box-shadow: 0 0 20px #00ff00;
  }
  
  &:active {
    transform: none;
    box-shadow: none;
  }
  
  &:focus {
    outline: none;
  }
`;

const LandingPageRedux: React.FC = () => {
    const history = useHistory();

    const shareOnTwitter = () => {
        const message = encodeURIComponent(`Dark Forest veterans, a distant signal calls…

[ redux.dfmud.xyz ]

Echoes of @darkforest_eth classic rounds stir once more…
Awakened by @DFArchon team

Tag 3 old commanders
The war approaches in silence…
@gubsheep
@VitalikButerin
@nicksdjohnson
`);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${message}`;
        window.open(twitterUrl, "_blank");
    };

    const enterGame = () => {
        // Add game entry logic here
        console.log("Entering game...");
        history.push('/game1');
    };

    return (
        <Container>
            <ContentContainer>
                <Title>Dark Forest Redux</Title>
                <Title>ETH $4000+ Celebration</Title>

                <Text>
                    A distant signal calls to you…<br />
                    Echoes of classic rounds stir once more…<br />
                    Awakened by the @DFArchon team
                </Text>

                <Text>
                    Tag 3 commanders from your old battlegrounds.<br />
                    The war approaches in silence…
                </Text>

                <Text>
                    <Link onClick={shareOnTwitter}>Share on Twitter</Link>
                </Text>

                <GameButton onClick={enterGame}>
                    Enter the Dark Forest
                </GameButton>

                <Text>
                    Dark Forest Community Round <br />
                    Start: Aug 16th <br />
                    Inifite Game <br />
                    More details will be revealed soon
                </Text>
            </ContentContainer>
        </Container>
    );
};

export default LandingPageRedux;

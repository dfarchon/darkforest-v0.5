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
  max-width: 900px;
  margin: auto;
  padding: 20px;
  text-align: left;
`;

const Title = styled.h1`
  font-size: 3em;
  margin: 0 0 20px 0;
`;

const PrizePoolTitle = styled.h2`
  font-size: 1.8em;
  margin: 20px 0 15px 0;
  color: #00ffff;
  text-align: center;
`;

const PrizePoolContainer = styled.div`
  background: rgba(0, 255, 0, 0.1);
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  width: 700px;
`;

const RightContainer = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  width: 700px;
  text-align: center;
`;

const PrizePoolAmount = styled.div`
  font-size: 1.8em;
  font-weight: bold;
  color: #00ffff;
  margin: 15px 0;
  text-shadow: 0 0 15px #00ffff;
`;

const PrizeRules = styled.div`
  text-align: left;
  margin: 20px 0;
`;

const RuleItem = styled.div`
  margin: 15px 0;
  padding: 10px;
  border-left: 3px solid #00ff00;
  background: rgba(0, 255, 0, 0.05);
`;

const MilestoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
`;

const MilestoneItem = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #00ffff;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const SponsorNote = styled.div`
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid #ffff00;
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  text-align: center;
  color: #ffff00;
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

const ContainerWrapper = styled.div`
  display: flex;
  gap: 30px;
  align-items: flex-start;
  justify-content: center;
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
        <ContainerWrapper>
          <PrizePoolContainer>
            <PrizePoolTitle>0.5 ETH 🏆 </PrizePoolTitle>

            <Text style={{ textAlign: 'center', marginBottom: '20px' }}>
              Prize pool will be distributed until exhausted
            </Text>

            <PrizeRules>
              <RuleItem>
                <strong>Base Reward:</strong> 0.000002 ETH per move (max 2000 moves per account)
              </RuleItem>

              <Text style={{ textAlign: 'center', margin: '20px 0' }}>
                <strong>Milestone Bonuses (cumulative):</strong>
              </Text>

              <MilestoneGrid>
                <MilestoneItem>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>100 Moves</span>
                  <span>+0.0001 ETH</span>
                </MilestoneItem>
                <MilestoneItem>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>500 Moves</span>
                  <span>+0.001 ETH</span>
                </MilestoneItem>
                <MilestoneItem>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>1000 Moves</span>
                  <span>+0.002 ETH</span>
                </MilestoneItem>
                <MilestoneItem>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>2000 Moves</span>
                  <span>+0.005 ETH</span>
                </MilestoneItem>
              </MilestoneGrid>

              <RuleItem>
                <strong>Distribution:</strong> Rewards distributed every 24 hours, ranked by moves
              </RuleItem>
            </PrizeRules>
          </PrizePoolContainer>

          <RightContainer>



            <div style={{ background: 'rgba(255,255,0,0.1)', border: '1px solid #ffff00', borderRadius: '8px', padding: '15px', margin: '20px 0', textAlign: 'center', color: '#ffff00' }}>
              <Text style={{ color: '#ffff00', margin: '0 0 10px 0' }}>
                💡 Want to sponsor and grow the prize pool? Please DM us!
              </Text>
            </div>



            <GameButton onClick={shareOnTwitter}>
              Share on X
            </GameButton>

            <GameButton onClick={enterGame}>
              Enter  Dark Forest
            </GameButton>

            <Text style={{ textAlign: 'center', marginTop: '20px' }}>
              Dark Forest Community Round <br />
              df 0.5 <br />
              Powered by DFArchon team <br />

              Start: Aug 16th 1PM (UTC+0) <br />
              Infinite Game <br />
            </Text>



          </RightContainer>
        </ContainerWrapper>
      </ContentContainer>
    </Container>
  );
};

export default LandingPageRedux;

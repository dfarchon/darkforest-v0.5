import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

const Container = styled.div`
  background-color: #000000;
  color: #00ff00;
  font-family: "Courier New", Courier, monospace;
  text-align: left;
  padding: 50px;
  min-height: 100vh;
`;

const ContentContainer = styled.div`
  max-width: 1000px;
  margin: auto;
  padding: 20px;
`;

const ContainerWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
`;

const PrizePoolContainer = styled.div`
  background: rgba(0, 255, 0, 0.05);
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 12px;       /* Reduced padding for compact height */
  flex: 1;
  min-width: 300px;
`;

const PrizePoolTitle = styled.h2`
  font-size: 1.5em;    /* Reduced font size for compact height */
  margin-bottom: 10px; /* Reduced margin */
  color: #00ffff;
  text-align: center;
`;

const PrizeRules = styled.div`
  text-align: left;
  margin: 10px 0;      /* Reduced margin */
`;

const RuleItem = styled.div`
  margin: 8px 0;       /* Reduced margin */
  padding: 6px;        /* Reduced padding */
  border-left: 3px solid #00ff00;
  background: rgba(0, 255, 0, 0.05);
  font-size: 0.9em;    /* Smaller font size */
`;

const MilestoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Smaller column width */
  gap: 8px;             /* Reduced gap */
  margin: 10px 0;       /* Reduced margin */
`;

const MilestoneItem = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #00ffff;
  border-radius: 6px;
  padding: 8px;         /* Reduced padding */
  text-align: center;
  font-size: 0.9em;     /* Smaller font size */
`;

const RightContainer = styled.div`
  flex: 1;
  min-width: 300px;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
`;

const GameButton = styled.button`
  background: transparent;
  border: 2px solid #00ff00;
  color: #00ff00;
  font-family: "Courier New", Courier, monospace;
  font-size: 1.2em;
  padding: 12px 25px;
  margin: 15px 0;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #00ff00;
    color: #000000;
    box-shadow: 0 0 15px #00ff00;
  }

  &:focus {
    outline: none;
  }
`;

const Text = styled.p`
  font-size: 1em;
  line-height: 1.5;
  margin: 15px 0;
`;

const LandingPageCombined: React.FC = () => {
  const history = useHistory();

  const shareOnTwitter = () => {
    const message = encodeURIComponent(`Dark Forest veterans, a distant signal calls…
[ redux.dfmud.xyz ]
Echoes of @darkforest_eth classic rounds stir once more…
Awakened by @DFArchon team
Tag 3 old commanders`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${message}`;
    window.open(twitterUrl, "_blank");
  };

  const enterGame = () => {
    history.push('/game1');
  };

  return (
    <Container>
      <ContentContainer>
        <ContainerWrapper>

          {/* ETH Prize Pool */}
          <PrizePoolContainer>
            <PrizePoolTitle>0.5 ETH 🏆</PrizePoolTitle>
            <Text style={{ textAlign: 'center' }}>
              Prize pool will be fully distributed today 🎉
            </Text>

            <PrizeRules>
              <RuleItem>
                <strong>Base Reward:</strong> 0.000002 ETH per move (max 2000 moves per account)
              </RuleItem>

              <Text style={{ textAlign: 'center' }}>
                <strong>Milestone Bonuses (cumulative):</strong>
              </Text>

              <MilestoneGrid>
                <MilestoneItem><strong>100 Moves</strong><br />+0.0001 ETH</MilestoneItem>
                <MilestoneItem><strong>500 Moves</strong><br />+0.001 ETH</MilestoneItem>
                <MilestoneItem><strong>1000 Moves</strong><br />+0.002 ETH</MilestoneItem>
                <MilestoneItem><strong>2000 Moves</strong><br />+0.005 ETH</MilestoneItem>
              </MilestoneGrid>

              <RuleItem>
                <strong>Distribution:</strong> Rewards distributed every 24 hours, ranked by moves
              </RuleItem>
            </PrizeRules>
          </PrizePoolContainer>

          {/* USDC Prize Pool */}
          <PrizePoolContainer>
            <PrizePoolTitle>1000 USDC 💰</PrizePoolTitle>
            <Text style={{ textAlign: 'center' }}>
              Player participation has been more enthusiastic than expected! 🚀
            </Text>

            <PrizeRules>
              <RuleItem>
                Starting Aug 21, 1 PM (UTC+0), 100 USDC will be distributed daily for 10 days
              </RuleItem>

              <RuleItem>
                Rewards distributed proportionally to the number of moves submitted within 24h
              </RuleItem>

              <RuleItem>
                ⚠️ DM your game address + Twitter ID to admin @DFArchon on Discord to register
              </RuleItem>
            </PrizeRules>
          </PrizePoolContainer>

          {/* Right Side Actions */}
          <RightContainer>
            <Text>
              💡 Want to sponsor and grow the prize pool? DM us!
            </Text>

            <GameButton onClick={shareOnTwitter}>Share on X</GameButton>
            <GameButton onClick={enterGame}>Enter Dark Forest</GameButton>

            <Text>
              Dark Forest Community Round<br />
              Powered by DFArchon team<br />
              Start: Aug 16th 1PM (UTC+0)<br />
              Infinite Game
            </Text>
          </RightContainer>
        </ContainerWrapper>
      </ContentContainer>
    </Container>
  );
};

export default LandingPageCombined;
import React from 'react';
import { render, screen } from '@testing-library/react';
import Leaderboard from '../Leaderboard';

describe('Leaderboard Component Tests', () => {
  const mockPlayers = [
    { nickname: 'Alpha', score: 1200, isConnected: true },
    { nickname: 'Beta', score: 850, isConnected: true },
    { nickname: 'Gamma', score: 600, isConnected: false }
  ];

  it('should render leaderboard title and columns', () => {
    render(
      <Leaderboard 
        players={mockPlayers} 
        isHost={false} 
        onNextQuestion={() => {}} 
        isLastQuestion={false} 
      />
    );

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Rank & Name')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('should list all players with scores sorted correctly', () => {
    render(
      <Leaderboard 
        players={mockPlayers} 
        isHost={false} 
        onNextQuestion={() => {}} 
        isLastQuestion={false} 
      />
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();

    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('850')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });

  it('should render action buttons for the host', () => {
    const handleNext = jest.fn();
    render(
      <Leaderboard 
        players={mockPlayers} 
        isHost={true} 
        onNextQuestion={handleNext} 
        isLastQuestion={false} 
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Next Question/i });
    expect(nextBtn).toBeInTheDocument();
  });
});

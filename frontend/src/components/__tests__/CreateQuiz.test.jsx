import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateQuiz from '../CreateQuiz';

describe('CreateQuiz Component Tests', () => {
  it('should render form headers and inputs correctly', () => {
    render(<CreateQuiz onBack={() => {}} onQuizCreated={() => {}} />);

    expect(screen.getByText('Create New Session')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. JavaScript Trivia Workshop')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Captain Code')).toBeInTheDocument();
    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
  });

  it('should show validation warnings if required fields are missing on submit', async () => {
    render(<CreateQuiz onBack={() => {}} onQuizCreated={() => {}} />);

    const submitBtn = screen.getByRole('button', { name: /Save & Publish Session/i });
    fireEvent.click(submitBtn);

    // Should render the local validation error alert
    expect(screen.getByText('Please fill in the Session Title and Host Name.')).toBeInTheDocument();
  });

  it('should call onBack handler when back button is clicked', () => {
    const handleBack = jest.fn();
    render(<CreateQuiz onBack={handleBack} onQuizCreated={() => {}} />);

    const backBtn = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});

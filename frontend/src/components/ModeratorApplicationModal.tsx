import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertTriangle, Shield, HelpCircle, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useApplyForModerator, useRecordSearchAttempt } from '../hooks/useQueries';
import { Principal } from '@dfinity/principal';

interface ModeratorApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'survey' | 'fallback' | 'congrats' | 'success';

const REDIRECT_URL =
  'https://scrambly-08a.caffeine.xyz/#caffeineAdminToken=1e26a47d377d80a92aeab3e155a944d585a92d281c2fdc04bc32da3806eb8b29';

interface SurveyQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q1',
    question: 'What color is Sonic the Hedgehog?',
    options: ['Red', 'Blue', 'Green', 'Yellow'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: "What is Sonic's rival's name?",
    options: ['Knuckles', 'Shadow', 'Dr. Eggman', 'Metal Sonic'],
    correctIndex: 2,
  },
  {
    id: 'q3',
    question: "Who is Sonic's best friend?",
    options: ['Amy Rose', 'Knuckles', 'Tails', 'Silver'],
    correctIndex: 2,
  },
  {
    id: 'q4',
    question: 'What console did Sonic the Hedgehog 1 originally release on?',
    options: ['Super Nintendo', 'Atari Jaguar', 'Sega Genesis', 'Game Boy'],
    correctIndex: 2,
  },
  {
    id: 'q5',
    question: 'When did Sonic the Hedgehog 1 come out?',
    options: ['1989', '1990', '1992', '1993'],
    // Note: correct answer is 1991 but it's NOT listed — wrong answer triggers fallback path
    // This question is intentionally tricky; any answer here leads to the fallback
    correctIndex: -1, // special: all options are wrong, triggers fallback
  },
];

// The year question is the last one and is intentionally a trap to expose the fallback path
// The correct answer "1991" is not among the options

export default function ModeratorApplicationModal({ open, onOpenChange }: ModeratorApplicationModalProps) {
  const { identity } = useInternetIdentity();
  const applyMutation = useApplyForModerator();
  const recordSearchMutation = useRecordSearchAttempt();

  const [step, setStep] = useState<Step>('survey');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [wrongAnswerMessage, setWrongAnswerMessage] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const searchDetectedRef = useRef(false);

  const principalId = identity?.getPrincipal().toString() ?? null;
  const storageKey = principalId ? `sonic_search_attempt_${principalId}` : null;

  const currentQuestion = SURVEY_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === SURVEY_QUESTIONS.length - 1;
  const isSurveyActive = step === 'survey';
  const isFallbackActive = step === 'fallback';

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('survey');
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setWrongAnswerMessage('');
      setFailedAttempts(0);
      searchDetectedRef.current = false;
    }
  }, [open]);

  // Redirect after congrats message
  useEffect(() => {
    if (step === 'congrats') {
      const timer = setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSearchDetection = useCallback(() => {
    if (!open || (!isSurveyActive && !isFallbackActive)) return;
    if (searchDetectedRef.current) return;
    if (!storageKey) return;

    if (localStorage.getItem(storageKey) === 'true') {
      return;
    }

    searchDetectedRef.current = true;
    localStorage.setItem(storageKey, 'true');

    if (principalId) {
      try {
        const principal = Principal.fromText(principalId);
        recordSearchMutation.mutate(principal);
      } catch {
        // Silently fail if principal parsing fails
      }
    }

    toast.warning('Search detected — a warning has been issued, but you may continue your application.', {
      duration: 6000,
    });
  }, [open, isSurveyActive, isFallbackActive, storageKey, principalId, recordSearchMutation]);

  // Attach visibility/focus listeners when modal is open and on survey or fallback step
  useEffect(() => {
    if (!open || (!isSurveyActive && !isFallbackActive)) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSearchDetection();
      }
    };

    const handleWindowBlur = () => {
      handleSearchDetection();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [open, isSurveyActive, isFallbackActive, handleSearchDetection]);

  const handleNextQuestion = async () => {
    if (selectedOption === null) return;
    setWrongAnswerMessage('');

    const question = SURVEY_QUESTIONS[currentQuestionIndex];

    // The last question (year question) has no correct option in the list — always triggers fallback
    if (question.correctIndex === -1) {
      // Any answer on the year question triggers the fallback path
      setStep('fallback');
      setSelectedOption(null);
      return;
    }

    if (selectedOption !== question.correctIndex) {
      setFailedAttempts((prev) => prev + 1);
      setWrongAnswerMessage('That answer is incorrect. Please try again.');
      setSelectedOption(null);
      return;
    }

    // Correct answer — advance or finish
    if (isLastQuestion) {
      // Submit application (shouldn't reach here due to year question trap, but handle gracefully)
      await submitApplication();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setWrongAnswerMessage('');
    }
  };

  const submitApplication = async () => {
    try {
      const result = await applyMutation.mutateAsync({ answer: '1991', userId: principalId });
      if (result.__kind__ === 'success') {
        setStep('success');
      } else if (result.__kind__ === 'failure') {
        setWrongAnswerMessage(result.failure.message);
        setFailedAttempts((prev) => prev + 1);
      } else {
        setWrongAnswerMessage('Unexpected response. Please try again.');
        setFailedAttempts((prev) => prev + 1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setWrongAnswerMessage(message);
      setFailedAttempts((prev) => prev + 1);
    }
  };

  const handleCantApply = () => {
    setStep('fallback');
    setWrongAnswerMessage('');
  };

  const handleFallbackTrue = async () => {
    try {
      const result = await applyMutation.mutateAsync({ answer: '1991', userId: principalId });
      if (result.__kind__ === 'success') {
        setStep('congrats');
      } else if (result.__kind__ === 'failure') {
        toast.error(result.failure.message);
      } else {
        toast.error('Unexpected response. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      toast.error(message);
    }
  };

  const handleFallbackFalse = () => {
    setStep('survey');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setWrongAnswerMessage('');
    setFailedAttempts(0);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const getDialogDescription = () => {
    switch (step) {
      case 'survey':
        return `Question ${currentQuestionIndex + 1} of ${SURVEY_QUESTIONS.length} — Sonic the Hedgehog knowledge survey.`;
      case 'fallback':
        return 'Answer this question to complete your application.';
      case 'congrats':
        return "You've been approved as a moderator!";
      case 'success':
        return 'Your application has been received.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Moderator Application
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* ── Survey step ── */}
        {step === 'survey' && (
          <div className="space-y-5 mt-2">
            {/* Progress indicator */}
            <div className="flex gap-1.5">
              {SURVEY_QUESTIONS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx < currentQuestionIndex
                      ? 'bg-positive'
                      : idx === currentQuestionIndex
                      ? 'bg-primary'
                      : 'bg-border'
                  }`}
                />
              ))}
            </div>

            {/* Slot info */}
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Slots available:</span> Up to 6 active moderators
              and 9 total moderator slots.
            </div>

            {/* Question */}
            <div className="space-y-3">
              <p className="font-medium text-foreground text-base leading-snug">
                {currentQuestion.question}
              </p>

              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedOption(idx);
                      setWrongAnswerMessage('');
                    }}
                    disabled={applyMutation.isPending}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      selectedOption === idx
                        ? 'border-primary bg-primary/10 text-foreground font-medium'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                          selectedOption === idx
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {wrongAnswerMessage && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{wrongAnswerMessage}</span>
                </div>

                {failedAttempts >= 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCantApply}
                    disabled={applyMutation.isPending}
                    className="w-full gap-1.5 text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Can't Apply?
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                onClick={handleNextQuestion}
                disabled={selectedOption === null || applyMutation.isPending}
                className="flex-1 gap-2"
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : isLastQuestion ? (
                  'Submit Application'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={applyMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Fallback Sega Genesis question step ── */}
        {step === 'fallback' && (
          <div className="space-y-6 mt-2">
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-base leading-snug">
                Did the Sonic 1 franchise come out on the Sega Genesis?
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Select the correct answer to complete your application.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleFallbackTrue}
                disabled={applyMutation.isPending}
                className="flex-1 gap-2 bg-positive hover:bg-positive/90 text-white"
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'True'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleFallbackFalse}
                disabled={applyMutation.isPending}
                className="flex-1"
              >
                False
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={applyMutation.isPending}
              className="w-full text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* ── Congratulations / redirect step ── */}
        {step === 'congrats' && (
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-positive/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-positive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-foreground text-lg">
                You're a moderator now — congratulations!
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Help the community and make sure no inappropriate activities happen.
              </p>
              <p className="text-muted-foreground text-xs mt-2 flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Redirecting you to the moderator portal…
              </p>
            </div>
          </div>
        )}

        {/* ── Original success step (pending review) ── */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-positive/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-positive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-foreground text-lg">Application Submitted!</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Your application has been submitted and is pending review. The admin will be in touch soon.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2 w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

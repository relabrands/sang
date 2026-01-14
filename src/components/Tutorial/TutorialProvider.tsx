
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, EVENTS, STATUS, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TutorialModal } from './TutorialModal';
import { TourButton } from './TourButton';

interface TutorialContextType {
    startTutorial: () => void;
    resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [run, setRun] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    // Define steps
    const steps: Step[] = [
        {
            target: '[data-tour="dashboard-summary"]',
            content: 'Aquí ves cuántos SANGs tienes activos y tu estado general.',
            title: 'Inicio',
            disableBeacon: true,
        },
        {
            target: '[data-tour="create-sang-btn"]',
            content: 'Crea un SANG para tu familia, amigos o compañeros. Tú defines monto, turnos y frecuencia.',
            title: 'Crear SANG',
        },
        {
            target: '[data-tour="join-sang-btn"]',
            content: 'Si te invitaron, coloca el código aquí y envías tu solicitud.',
            title: 'Unirme a SANG',
        },
        {
            target: '[data-tour="nav-sangs"]',
            content: 'Aquí ves todos tus SANGs: Activos, Pendientes y Completados.',
            title: 'Tus SANGs',
        },
        // Note: These steps might be skipped if elements are not present (e.g., if user has no SANG)
        // We can rely on Joyride to skip them if target not found, or handle navigation.
        // For a robust onboarding, we usually need the elements to exist. 
        // Since this is "First Login", these specific inner-SANG elements won't exist.
        // However, adhering to the requested script:
        {
            target: '[data-tour="sang-turns"]',
            content: 'Este es el orden de turnos. Tu número te dice cuándo te toca recibir.',
            title: 'Turnos y Calendario',
        },
        {
            target: '[data-tour="sang-payments"]',
            content: 'Cuando te toque pagar, subes tu comprobante aquí y el organizador lo confirma.',
            title: 'Pagos',
        },
        {
            target: '[data-tour="profile-reputation"]',
            content: 'Tu reputación se basa en pagos a tiempo. Mantenerla alta te ayuda a entrar a mejores SANGs.',
            title: 'Reputación',
        },
        {
            target: '[data-tour="header-notifications"]',
            content: 'Te avisamos cuando te acepten, cuando confirmen tu pago y cuando sea tu turno.',
            title: 'Notificaciones',
        }
    ];

    // Check if tutorial has been seen
    useEffect(() => {
        if (userProfile && !userProfile.tutorialSeen && !run && !showModal) {
            // Small delay to ensure UI is ready
            const timer = setTimeout(() => {
                setShowModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [userProfile, run, showModal]);

    const markComplete = async () => {
        if (currentUser) {
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, { tutorialSeen: true });
                // Update local state is tricky without reloading userProfile, 
                // but AuthProvider usually listens to snapshots so it might auto-update.
            } catch (error) {
                console.error("Error marking tutorial as seen:", error);
            }
        }
        setRun(false);
        setShowModal(false);
    };

    const handleStart = () => {
        setShowModal(false);
        setRun(true);
        setStepIndex(0);
        navigate('/dashboard'); // Ensure we start at dashboard
    };

    const handleSkip = () => {
        markComplete();
    };

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { action, index, status, type } = data;

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRun(false);
            markComplete();
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            // Logic for navigation based on NEXT step
            // Current index is the one just finished (or failed)
            const nextIndex = index + (action === 'prev' ? -1 : 1);

            // Step Mapping for Navigation
            // 0-3: Dashboard (No nav needed usually)
            // 4: SANGs Tab -> Might Navigate to /sangs?
            // 5-6: SANG Detail -> Hard to navigate without ID.
            // 7: Profile -> Profile Page

            // If we are moving to Step 7 (Reputation), navigate to Profile
            // Step index 6 is "profile-reputation" (0-based: 0,1,2,3,4,5,6,7)
            if (nextIndex === 6) {
                navigate('/profile');
            }
            // If we are moving back to start, go to dashboard
            if (nextIndex === 0) {
                navigate('/dashboard');
            }

            setStepIndex(nextIndex);
        }
    };

    const startTutorial = () => {
        handleStart();
    };

    const resetTutorial = () => {
        setRun(false);
        setStepIndex(0);
    };

    return (
        <TutorialContext.Provider value={{ startTutorial, resetTutorial }}>
            {showModal && <TutorialModal open={showModal} onStart={handleStart} onSkip={handleSkip} />}

            <Joyride
                run={run}
                steps={steps}
                stepIndex={stepIndex}
                callback={handleJoyrideCallback}
                continuous
                showProgress
                showSkipButton
                disableOverlayClose
                locale={{
                    back: 'Atrás',
                    close: 'Cerrar',
                    last: 'Finalizar',
                    next: 'Siguiente',
                    skip: 'Omitir',
                }}
                styles={{
                    options: {
                        primaryColor: '#6D2AE1',
                        zIndex: 1000,
                        overlayColor: 'rgba(0, 0, 0, 0.5)',
                    },
                    tooltip: {
                        borderRadius: '16px',
                        fontFamily: 'inherit',
                    },
                    buttonNext: {
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                    },
                    buttonBack: {
                        marginRight: '10px',
                        color: '#6b7280',
                    }
                }}
            />

            {children}

            {!run && !showModal && userProfile && (
                <TourButton onClick={startTutorial} />
            )}
        </TutorialContext.Provider>
    );
};

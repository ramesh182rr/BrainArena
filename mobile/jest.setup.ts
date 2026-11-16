import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

// The native safe-area provider never reports insets under Jest, so use the library's mock.
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

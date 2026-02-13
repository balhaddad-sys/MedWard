# Gemini Code Assist Instructions

## Project Context
This is a React web application (MedWard) using **Vite** and **TypeScript**.
We use **Firebase** for backend services and **Tailwind CSS** for styling.

## Tech Stack
- **Language**: TypeScript
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, clsx, lucide-react
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Backend**: Firebase (v11)
- **Testing**: Vitest, React Testing Library
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Notifications**: react-hot-toast
- **PDF**: jsPDF

## Coding Standards
- **Style**: Functional components with Hooks.
- **Type Safety**: Strict TypeScript usage. Avoid `any`.
- **Imports**: Use absolute imports where configured, or relative imports consistently.
- **Styling**: Use utility classes (Tailwind) combined with `clsx` for conditional styling.
- **Dates**: Use `date-fns` for all date formatting and manipulation.
- **Naming**: PascalCase for components, camelCase for functions, and UPPER_CASE for constants.

## Folder Structure
- **UI Components**: `src/components/ui` (Generic, reusable)
- **Features**: `src/features/{featureName}` (Domain specific logic & components)
- **Lib/Utils**: `src/lib` (Firebase config, helpers)
- **Hooks**: `src/hooks` (Global hooks)

## Response Guidelines
- Prioritize functional components and modern React patterns (Hooks).
- Use `async/await` for Firebase interactions.
- Ensure all code snippets are typed (TypeScript).
- When suggesting UI components, use Tailwind CSS classes.
- Use `react-hot-toast` for user notifications (e.g., `toast.success()`).
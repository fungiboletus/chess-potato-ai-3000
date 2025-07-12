import { ChessGame } from './ChessGame'
import { ChessGameProvider } from './providers/ChessGameProvider'
import './App.css'
import './i18n/i18n'

function App() {
  return (
    <div className="app">
      <ChessGameProvider>
        <ChessGame />
      </ChessGameProvider>
    </div>
  )
}

export default App

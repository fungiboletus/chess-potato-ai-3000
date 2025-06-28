import { ChessGame } from './ChessGame'
import { ChessGameProvider } from './providers/ChessGameProvider'
import './App.css'

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

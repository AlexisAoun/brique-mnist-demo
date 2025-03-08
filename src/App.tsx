import React from 'react';
import logo from './logo.svg';
import './App.css';

function SquaredGrid({n}: {n: number}) {
  const elements = Array.from({length: n}, (_, index) => (
    <div className='box'>{index}</div>
  ));
  return <div className='grid'>{elements}</div>
}

function App() {
  const size: number = 28*28;

  return (
    <div className="App">
      <header className="App-header">
        <SquaredGrid n={size}></SquaredGrid>
        <p className='App-text'>
          reload.
        </p>
      </header>
    </div>
  );
}

export default App;

import { useState, useRef, useEffect } from 'react';
import './App.css';
import wordFile from './assets/words/_5_letter_words_sorted.txt';

/* 
INPUT RULES:
ActiveRow indicates which row the input will go into
ActiveIndex indicates which letter will be affected by input
ActiveLetter, a term used in this section, refers to the div element indicated by ActiveRow and ActiveIndex.
ActiveLetter can also be mathematically denoted as 'activeRow * numInputsPerRow + activeIndex'

Input Character : Description
-------------------------------
Space           : changes the ActiveLetter's state, cycling through 1 of 3 available states
Letter          : Case Insensitive, increments ActiveIndex and enters the letter into ActiveLetter's Div element.
                : If ActiveLetter is the last letter, do nothing.
                : If ActiveLetter is the first letter and no letter has been inputted, ActiveIndex is not incremented.
Backspace       : Removes the letter from the ActiveLetter's corresponding Div element, changes the state to 'LetterState.NotInWord' and decrements ActiveIndex.
                : If ActiveLetter is the first letter, do nothing.
Delete          : Remove the letters and reset the states of the entire row, then decrements the ActiveRow and sets the ActiveIndex to the last letter.
                : If ActiveRow is the first row, do not decrement ActiveRow, and set ActiveIndex to the first letter.
*/

function App() {
  enum LetterState {
    NotInWord = 0,
    InWordNotHere = 1,
    InWordHere = 2,
    NotHereInWord = 3
  }

  class Letter {
    constructor (letter: string) {
      this.letter = letter;
      this.state = LetterState.NotInWord;
    }
    letter: string;
    state: LetterState;
    toString() : string {
      return "(" + this.letter + ":" + this.state + ")";
    }
  }

  class FilterWord {
    constructor (size: number) {
      this.letters = Array.from({ length: size }, () => new Letter(''));
    }
    letters: Letter[];

    setLetterAt(index: number, letter: string) {
      this.letters[index].letter = letter;
    }

    setStateAt(index:number, state: LetterState) {
      this.letters[index].state = state;
    }

    updateStates() {
      // const hasLetters: string[] = [];

      // this.letters.forEach((letter) => {
      //   if (letter.state === LetterState.InWordHere || letter.state === LetterState.InWordNotHere) hasLetters.push(letter.letter);
      // })

      // this.letters.forEach((letter) => {
      //   if (letter.state === LetterState.NotInWord && hasLetters.includes(letter.letter)) letter.state = LetterState.NotHereInWord;
      // })
      const counts: { [key: string]: number } = {};

      // Count occurrences of each letter
      for (const letter of this.letters) {
        if (!counts[letter.letter]) counts[letter.letter] = 0;
        if (letter.state === LetterState.InWordHere || letter.state === LetterState.InWordNotHere) {
          counts[letter.letter]++;
        }
      }

      // Update states
      for (const letter of this.letters) {
        if (counts[letter.letter] && letter.state === LetterState.NotInWord) {
          letter.state = LetterState.NotHereInWord;
        }
      }
    }

    toString () : string {
      let word = ""; this.letters.forEach((letterObj: Letter) => {
        word += letterObj.letter;
      });
      let states = ""; this.letters.forEach((letterObj: Letter) => {
        states += String(letterObj.state);
      });
      return word + " | " + states;
    }
  }
  
  // Setup constants. Not constant because future feature includes more rows and more letters
  const numRows = 6;
  const numInputsPerRow = 5;

  // Words for right panel
  const [allWords, setAllWords] = useState<string[]>([]);
  // const allWords = useRef<string[]>([]);
  const [filteredWords, setFilteredWords] = useState<string[][]>(
    Array.from({ length: numRows }, () => [])
  );
  const allWordsRef = useRef(allWords)
  const filteredWordsRef = useRef(filteredWords);

  // State
  const [state, setState] = useState({
    inputValues: Array.from({ length: numRows }, () => Array.from({ length: numInputsPerRow }, () => '')),
    inputStates: Array.from({ length: numRows }, () => Array.from({ length: numInputsPerRow }, () => LetterState.NotInWord)),
    activeRow: 0,
    activeIndex: 0
  });

  const inputRefs = Array.from({ length: numRows * numInputsPerRow }, () => useRef<HTMLDivElement>(null));

  useEffect(() => {
    fetch(wordFile)
      .then((response) => response.text())
      .then((data) => {
        const wordsArray = data.split('\r\n');
        // allWords.current = wordsArray;
        setAllWords(wordsArray);
        allWordsRef.current = wordsArray
      });
  }, []);
  
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    filteredWordsRef.current = filteredWords
  }, [filteredWords])

  const onBackspace = () => {
    console.log("OnBackspace");
    setState((currentState) => {
      const nextInputValues = currentState.inputValues.map(row => [...row]);
      const nextInputStates = currentState.inputStates.map(row => [...row]);
      const nextActiveIndex = currentState.activeIndex === 0 ? 0 : currentState.activeIndex - 1;

      nextInputValues[currentState.activeRow][currentState.activeIndex] = '';
      nextInputStates[currentState.activeRow][currentState.activeIndex] = LetterState.NotInWord;

      return {
        ...currentState,
        inputValues: nextInputValues,
        inputStates: nextInputStates,
        activeIndex: nextActiveIndex
      }
    })
  }
  
  const onEnter = () => {
    if (state.activeRow === numRows) return;
    console.log("OnEnter");
    setState((currentState) => {
      const word = currentState.inputValues[currentState.activeRow].join('');
      console.log("Word: ", word);
      console.log("Valid Word ", word, ": ", allWordsRef.current.includes(word));
      if (!allWordsRef.current.includes(word)) return currentState;

      const filterWord = new FilterWord(numInputsPerRow);
      for (let i = 0; i < numInputsPerRow; i++) {
        filterWord.letters[i].letter = currentState.inputValues[currentState.activeRow][i];
        filterWord.letters[i].state = currentState.inputStates[currentState.activeRow][i];
      }
      filterWord.updateStates();
      console.log("FilterWord: ", filterWord);
      
      const currentWords = currentState.activeRow > 0 ? filteredWordsRef.current[currentState.activeRow - 1] : allWordsRef.current;
      console.log("Current Words:", currentWords)
      const newWords = applyFilterWord(currentWords, filterWord);
      const nextFilteredWords = [...filteredWords]
      nextFilteredWords[currentState.activeRow] = newWords;
      setFilteredWords(nextFilteredWords);

      const nextActiveRow = currentState.activeRow + 1;
      const nextActiveIndex = 0;
      return {
        ...currentState,
        activeRow: nextActiveRow,
        activeIndex: nextActiveIndex
      }
    })
  }

  const onLetter = (letter: string) => {
    console.log("OnLetter");
    setState((currentState) => {
      if (currentState.activeIndex >= numInputsPerRow - 1) return currentState;

      const nextInputValues = currentState.inputValues.map(row => [...row]);
      // If index is 0 and a letter has not been entered into the corresponding inputValue, do not increment index
      const currentLetter = currentState.inputValues[currentState.activeRow][currentState.activeIndex];
      const nextActiveIndex = currentState.activeIndex === 0 && currentLetter === '' ? 0 : currentState.activeIndex + 1;

      nextInputValues[currentState.activeRow][nextActiveIndex] = letter;

      return {
        ...currentState,
        inputValues: nextInputValues,
        activeIndex: nextActiveIndex
      }
    })
  }

  const onSpace = () => {
    console.log("OnSpace");
    setState((currentState) => {
      const nextInputStates = currentState.inputStates.map(row => [...row]);

      switch (nextInputStates[currentState.activeRow][currentState.activeIndex]) {
        case LetterState.NotInWord: nextInputStates[currentState.activeRow][currentState.activeIndex] = LetterState.InWordNotHere; break;
        case LetterState.NotHereInWord: nextInputStates[currentState.activeRow][currentState.activeIndex] = LetterState.InWordNotHere; break;
        case LetterState.InWordNotHere: nextInputStates[currentState.activeRow][currentState.activeIndex] = LetterState.InWordHere; break;
        case LetterState.InWordHere: nextInputStates[currentState.activeRow][currentState.activeIndex] = LetterState.NotInWord; break;
      }

      return {
        ...currentState,
        inputStates: nextInputStates
      }
    })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    event.preventDefault()
    if (event.key === 'Backspace') {
      onBackspace();
    } else if (event.key === 'Enter') {
      onEnter();
    } else if (event.key === ' ') {
      onSpace();
    } else if (/^[A-Z]$/.test(event.key.toUpperCase())) {
      onLetter(event.key.toUpperCase());
    }
  };

  const applyFilterWord = (words: string[], filterWord: FilterWord) => {
    filterWord.updateStates();

    return words.filter((word) => {
  
      // console.log("Filtering for word: " + word);
      // console.log("Filter word: " + filterWord);
  
      for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const filterLetter = filterWord.letters[i].letter;
        const filterState = filterWord.letters[i].state;
  
        // console.log("Filter letter: " + filterLetter);
  
        switch (filterState) {
          case LetterState.InWordHere:
            if (letter !== filterLetter) {
              // console.log("InWordHere filter failed");
              return false;
            }
            break;
  
          case LetterState.NotInWord:
            if (word.includes(filterLetter)) {
              // console.log("NotInWord filter failed");
              return false;
            }
            break;
  
          case LetterState.InWordNotHere:
            if (letter === filterLetter || !word.includes(filterLetter)) {
              // console.log("InWordNotHere filter failed");
              return false;
            }
            break;
  
          case LetterState.NotHereInWord:
            if (letter === filterLetter) {
              // console.log("NotHereInWord filter failed");
              return false;
            }
            break;
        }
      }
  
      // console.log(word + " passed filter.")
      return true;
    });
  };
  
  return (
    <div>
      <div className="title-box">
        <h1 className="title">Wordle Solver</h1>
      </div>
      <div className="app-container">
        <div className="left-panel">
        {state.inputValues.map((row, rowIndex) => (
          <div className="input-row" key={rowIndex}>
            {row.map((letter, index) => {
              const currentIndex = rowIndex * numInputsPerRow + index;
              const isActive = currentIndex === state.activeRow * numInputsPerRow + state.activeIndex;
              const isDisabled = currentIndex > state.activeRow * numInputsPerRow + state.activeIndex;

              return (
                <div
                  key={index}
                  className={`single-input 
                  ${isActive ? 'active' : ''} 
                  ${isDisabled ? 'disabled' : ''}
                  state-${state.inputStates[rowIndex][index]}
                  `}
                  ref={inputRefs[currentIndex]}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
        </div>
        <div className="right-panel">
          <h2>Solutions</h2>
          <div className="word-list">
            {(state.activeRow === 0 ? allWords : filteredWords[state.activeRow - 1]).map((word, index) => (
              <div key={index} className="word-item">
                {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
import React, { createContext } from "react"
import useSound from "use-sound"
import soundUrl from "/sound/sounds.mp3"

export const SoundContext = createContext()

export const SoundProvider = (props) => {
  const [play] = useSound(soundUrl, {
    sprite: {
      backNextButton: [0, 1000],
      selectOption: [2000, 800],
      error: [3000, 2000]
    }
  })

  const playSound = (sound) => {
    play({ id: sound })
  }

  return (
    <SoundContext.Provider value={{ playSound }}>
      {props.children}
    </SoundContext.Provider>
  )
}

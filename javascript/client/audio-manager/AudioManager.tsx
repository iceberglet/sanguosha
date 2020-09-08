
class AudioManager {

    cache = new Map<string, any>()

    play(name: string) {
        if(this.cache.has(name)) {
            this.cache.get(name).play()
            return
        }

        try {
            let audio = new Audio(name)
            audio.play()
            this.cache.set(name, audio)
            return
        } catch (err) {
            console.error('No Such Sound ', name)
        }
    }
}

export const audioManager = new AudioManager()
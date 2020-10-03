import * as React from 'react'
import { CSSTransition } from 'react-transition-group'

type ImageProp = {
    style: React.CSSProperties
}

export default function SwitchableImage(p: ImageProp) {

    let [isFlashing, setFlashing] = React.useState<boolean>(false)

    React.useEffect(()=>{
        setFlashing(true)

        setTimeout(()=>{
            setFlashing(false)
        }, 500)
    }, [p.style.backgroundImage])

    return <div className={'card-avatar ' + (isFlashing? 'img-flashing' : '')}>
            <div className={'img'} style={p.style} />
        </div>
}
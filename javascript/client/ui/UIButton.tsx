import * as React from 'react'

type ButtonProp = {
    display: string
    disabled: boolean
    onClick: ()=>void
}

export default function UIButton(p: ButtonProp) {
    return <button className='ui-button' disabled={p.disabled} onClick={p.onClick}>
        {p.display}
    </button>
}
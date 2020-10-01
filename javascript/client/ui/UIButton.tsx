import * as React from 'react'

type ButtonProp = {
    display: string
    disabled: boolean
    onClick: ()=>void
    className?: string
}

export default function UIButton(p: ButtonProp) {
    return <button className={'ui-button ' + p.className} disabled={p.disabled} onClick={()=>p.disabled || p.onClick()}>
        {p.display}
    </button>
}
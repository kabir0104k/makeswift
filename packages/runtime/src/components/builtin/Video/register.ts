import dynamic from 'next/dynamic'

import { forwardNextDynamicRef } from '../../../next'
import { Props } from '../../../prop-controllers'
import { ReactRuntime } from '../../../runtimes/react'
import { MakeswiftComponentType } from '../constants'
import { ComponentIcon } from '../../../state/modules/components-meta'

export function registerComponent(runtime: ReactRuntime) {
  return runtime.registerComponent(
    forwardNextDynamicRef(patch => dynamic(() => patch(import('./Video')))),
    {
      type: MakeswiftComponentType.Video,
      label: 'Video',
      icon: ComponentIcon.Video,
      props: {
        id: Props.ElementID(),
        video: Props.Video({ preset: { controls: true } }),
        width: Props.Width({
          format: Props.Width.Format.ClassName,
          defaultValue: { value: 560, unit: 'px' },
        }),
        margin: Props.Margin({ format: Props.Margin.Format.ClassName }),
        borderRadius: Props.BorderRadius({ format: Props.BorderRadius.Format.ClassName }),
      },
    },
  )
}

declare module "react-simple-maps" {
  import { FC, ReactNode } from "react"

  interface ComposableMapProps {
    projectionConfig?: Record<string, unknown>
    style?: React.CSSProperties
    className?: string
    children?: ReactNode
  }

  interface ZoomableGroupProps {
    children?: ReactNode
    center?: [number, number]
    zoom?: number
  }

  interface GeographiesProps {
    geography: string
    children: (args: { geographies: Geography[] }) => ReactNode
  }

  interface Geography {
    rsmKey: string
    id: string
    properties: Record<string, unknown>
    [key: string]: unknown
  }

  interface GeographyProps {
    geography: Geography
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    className?: string
    onClick?: () => void
  }

  export const ComposableMap: FC<ComposableMapProps>
  export const ZoomableGroup: FC<ZoomableGroupProps>
  export const Geographies: FC<GeographiesProps>
  export const Geography: FC<GeographyProps>
}

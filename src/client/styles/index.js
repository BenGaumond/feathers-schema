
const variables = {

  largeWidth: { value: 1500, units: 'px' },
  medWidth: { value: 1200, units: 'px' },
  smallWidth: { value: 800, units: 'px' },
  miniWidth: { value: 500, units: 'px' },

  animationTime: { value: 250, units: 'ms'},
  rootFontSize: { value: 1.25, units: 'em'},
  padding: { value: 0.8, units: 'rem'}

}

const colors = {
  textColor: '#fff',
  textColorHover: '#aaa',
  textColorInverted: '#000',
  bgColor: 'transparent',
}

colors.bgColorInverted = colors.textColor

export { variables, colors }

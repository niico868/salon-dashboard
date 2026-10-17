import { Text, TextProps } from 'react-native';
import { type } from '../lib/theme';

// Brand text styles. Use these instead of plain <Text> so fonts stay consistent.
const make = (style: object, name: string) => {
  const C = ({ style: extra, ...rest }: TextProps) => <Text style={[style, extra]} {...rest} />;
  C.displayName = name;
  return C;
};

export const Greeting = make(type.greeting, 'Greeting');       // Great Vibes script
export const Title = make(type.title, 'Title');                // Playfair Bold: screen titles
export const Heading = make(type.heading, 'Heading');          // Playfair SemiBold: section headings
export const Body = make(type.body, 'Body');                   // Lato: everyday text
export const BodyStrong = make(type.bodyStrong, 'BodyStrong');
export const Label = make(type.label, 'Label');                // small grey labels above values
export const Small = make(type.small, 'Small');

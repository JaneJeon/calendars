import { useRef, type CSSProperties, type ReactNode } from 'react'
import {
  Box,
  CloseButton,
  Collapsible,
  Flex,
  Heading,
  HStack,
  Link,
  Popover,
  Portal,
  Stack,
  Text
} from '@chakra-ui/react'
import { ArrowUpRight, CalendarDays, Layers2, MapPin } from 'lucide-react'
import {
  eventDetailTime,
  type CalendarEvent,
  type EventProjection,
  type ViewId
} from '../calendar'
import { feeds } from '../content'
import { focusRing } from '../theme'
import { eventButton } from './event-button'

export function EventDetails(props: {
  event: CalendarEvent
  closeControl?: ReactNode
}) {
  const category =
    props.event.categories.join(', ') || feeds[props.event.calendar].name
  return (
    <Box>
      <Flex align="start" justify="space-between" gap="16px">
        <Box>
          <Text
            color="calendar.link"
            fontSize="11px"
            fontWeight="500"
            letterSpacing=".06em"
            textTransform="uppercase"
          >
            {category}
          </Text>
          <Heading
            as="h3"
            mt="5px"
            color="calendar.text"
            fontSize="20px"
            fontWeight="500"
            lineHeight="1.15"
          >
            {props.event.title}
          </Heading>
        </Box>
        {props.closeControl}
      </Flex>
      <Stack
        mt="17px"
        gap="11px"
        pt="15px"
        borderTopWidth="1px"
        borderColor="calendar.border"
      >
        <HStack align="start" gap="9px">
          <CalendarDays size={16} color="#91B8FF" aria-hidden="true" />
          <Text color="calendar.text" fontSize="13px">
            {eventDetailTime(props.event)}
          </Text>
        </HStack>
        {props.event.location && (
          <HStack align="start" gap="9px">
            <MapPin size={16} color="#91B8FF" aria-hidden="true" />
            <Text color="calendar.text" fontSize="13px">
              {props.event.location}
            </Text>
          </HStack>
        )}
        <HStack align="start" gap="9px">
          <Layers2 size={16} color="#91B8FF" aria-hidden="true" />
          <Text color="calendar.text" fontSize="13px">
            {feeds[props.event.calendar].name}
          </Text>
        </HStack>
      </Stack>
      {props.event.description && (
        <Text
          mt="15px"
          color="calendar.muted"
          fontSize="13px"
          lineHeight="1.55"
        >
          {props.event.description}
        </Text>
      )}
      {props.event.url && (
        <Link
          href={props.event.url}
          target="_blank"
          rel="noopener noreferrer"
          display="inline-flex"
          alignItems="center"
          gap="4px"
          mt="15px"
          minH={{ base: '44px', md: 'auto' }}
          py={{ base: '8px', md: '0' }}
          color="calendar.link"
          fontSize="13px"
          fontWeight="500"
          _focusVisible={focusRing}
        >
          View event source <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      )}
    </Box>
  )
}

export function EventTrigger(props: {
  projection: EventProjection
  variant: ViewId
  isNarrow: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
}) {
  const open = props.selectedKey === props.projection.key
  const triggerRef = useRef<HTMLButtonElement>(null)
  if (props.isNarrow && props.variant === 'list')
    return (
      <Collapsible.Root
        open={open}
        onOpenChange={({ open }) =>
          props.setSelectedKey(open ? props.projection.key : null)
        }
      >
        <Collapsible.Trigger asChild>
          {eventButton(
            props.projection,
            props.variant,
            open,
            undefined,
            triggerRef
          )}
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box
            mt="6px"
            p="16px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="11px"
            bg="calendar.raised"
          >
            <EventDetails
              event={props.projection.event}
              closeControl={
                <CloseButton
                  aria-label="Close event details"
                  size="sm"
                  minW={{ base: '44px', md: '32px' }}
                  minH={{ base: '44px', md: '32px' }}
                  color="calendar.muted"
                  _hover={{ bg: 'action.subtle', color: 'calendar.text' }}
                  _focusVisible={focusRing}
                  onClick={() => {
                    props.setSelectedKey(null)
                    requestAnimationFrame(() => triggerRef.current?.focus())
                  }}
                />
              }
            />
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    )

  return (
    <Popover.Root
      open={open}
      onOpenChange={({ open }) =>
        props.setSelectedKey(open ? props.projection.key : null)
      }
      positioning={{
        placement: 'bottom-start',
        strategy: 'fixed',
        hideWhenDetached: true,
        gutter: 8
      }}
      autoFocus={false}
      modal={false}
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>
        {eventButton(props.projection, props.variant, open)}
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            aria-label={`${props.projection.event.title} details`}
            w="min(350px, calc(100vw - 28px))"
            p="17px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="13px"
            bg="calendar.raised"
            color="calendar.text"
            boxShadow="0 18px 54px rgba(0,0,0,.42)"
            zIndex="90"
            style={
              {
                '--popover-bg': 'var(--chakra-colors-calendar-raised)'
              } as CSSProperties
            }
          >
            <Popover.Arrow>
              <Popover.ArrowTip
                bg="calendar.raised"
                borderColor="calendar.controlBorder"
              />
            </Popover.Arrow>
            <EventDetails
              event={props.projection.event}
              closeControl={
                <Popover.CloseTrigger asChild>
                  <CloseButton
                    aria-label="Close event details"
                    size="sm"
                    color="calendar.muted"
                    _hover={{ bg: 'action.subtle', color: 'calendar.text' }}
                    _focusVisible={focusRing}
                  />
                </Popover.CloseTrigger>
              }
            />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

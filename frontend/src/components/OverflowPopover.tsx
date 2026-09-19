import { useState, type CSSProperties } from 'react'
import {
  Box,
  Button,
  CloseButton,
  Flex,
  Popover,
  Portal,
  Stack
} from '@chakra-ui/react'
import { ChevronLeft } from 'lucide-react'
import { fullDate, type EventProjection } from '../calendar'
import { focusRing } from '../theme'
import { EventDetails } from './EventDetails'
import { eventButton } from './event-button'

function overflowEventButtonId(key: string): string {
  return `calendar-overflow-event-${encodeURIComponent(key)}`
}

export function OverflowPopover(props: {
  projections: EventProjection[]
  day: string
}) {
  const [selected, setSelected] = useState<EventProjection | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const backButtonId = `calendar-overflow-back-${props.day}`
  const selectEvent = (projection: EventProjection) => {
    setSelected(projection)
    setFocusTarget('back')
  }
  const showEventList = (selectedKey: string) => {
    setSelected(null)
    setFocusTarget(selectedKey)
  }
  return (
    <Popover.Root
      positioning={{
        placement: 'bottom-start',
        strategy: 'fixed',
        hideWhenDetached: true,
        gutter: 7
      }}
      autoFocus={false}
      onOpenChange={({ open }) => !open && setSelected(null)}
    >
      <Popover.Trigger asChild>
        <Button
          variant="plain"
          h="auto"
          minH="24px"
          px="6px"
          py="2px"
          color="calendar.muted"
          fontSize="11px"
          fontWeight="500"
          _hover={{ color: 'calendar.link' }}
          _focusVisible={focusRing}
        >
          +{props.projections.length} more
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w="min(350px, calc(100vw - 28px))"
            p="7px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="12px"
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
            <Flex px="8px" py="7px" align="center" justify="space-between">
              <Popover.Title fontSize="13px" fontWeight="500">
                {selected ? 'Event details' : fullDate(props.day)}
              </Popover.Title>
              <Popover.CloseTrigger asChild>
                <CloseButton
                  aria-label="Close day events"
                  size="sm"
                  color="calendar.muted"
                  _focusVisible={focusRing}
                />
              </Popover.CloseTrigger>
            </Flex>
            {selected ? (
              <Box px="8px" pb="8px">
                <Button
                  id={backButtonId}
                  ref={element => {
                    if (element && focusTarget === 'back')
                      requestAnimationFrame(() => element.focus())
                  }}
                  variant="plain"
                  h="auto"
                  mb="12px"
                  p="4px 6px"
                  color="calendar.link"
                  onClick={() => showEventList(selected.key)}
                  _focusVisible={focusRing}
                >
                  <ChevronLeft size={14} /> Back to {fullDate(props.day)}
                </Button>
                <EventDetails event={selected.event} />
              </Box>
            ) : (
              <Stack gap="3px">
                {props.projections.map(projection => (
                  <Box key={projection.key}>
                    {eventButton(
                      projection,
                      'list',
                      false,
                      () => selectEvent(projection),
                      element => {
                        if (element && focusTarget === projection.key)
                          requestAnimationFrame(() => element.focus())
                      },
                      overflowEventButtonId(projection.key)
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

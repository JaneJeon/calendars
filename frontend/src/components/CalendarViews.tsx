import { Fragment, useMemo, type ReactNode } from 'react'
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Spinner,
  Stack,
  Text
} from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import {
  dateKey,
  fullDate,
  monthGrid,
  monthLabel,
  shortDate,
  shortWeekday,
  type EventProjection
} from '../calendar'
import { controlProps, eventTone, focusRing } from '../theme'
import { EventTrigger } from './EventDetails'
import { OverflowPopover } from './OverflowPopover'

export function CalendarGrid(props: {
  month: string
  todayKey: string
  projections: EventProjection[]
  isNarrow: boolean
  compact: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  showDayInList: (day: string) => void
}) {
  const today = props.todayKey.startsWith(`${props.month}-`)
    ? props.todayKey
    : ''
  const limit = props.compact ? 2 : 3
  const dates = monthGrid(props.month)
  const weeks = Array.from({ length: 6 }, (_, index) =>
    dates.slice(index * 7, index * 7 + 7)
  )
  return (
    <Box role="table" aria-label={monthLabel(props.month)}>
      <Grid
        role="row"
        gridTemplateColumns="repeat(7, minmax(0, 1fr))"
        borderBottomWidth="1px"
        borderColor="calendar.border"
        bg="calendar.inset"
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text
            key={day}
            role="columnheader"
            px={{ base: '2px', md: '10px' }}
            py="8px"
            color="calendar.subtle"
            fontSize="11px"
            fontWeight="500"
            textAlign={{ base: 'center', md: 'right' }}
            textTransform="uppercase"
          >
            {day}
          </Text>
        ))}
      </Grid>
      {weeks.map((week, weekIndex) => (
        <Grid
          key={dateKey(week[0]!)}
          role="row"
          gridTemplateColumns="repeat(7, minmax(0, 1fr))"
        >
          {week.map((date, dayIndex) => {
            const index = weekIndex * 7 + dayIndex
            const key = dateKey(date)
            const outside = !key.startsWith(`${props.month}-`)
            const matches = outside
              ? []
              : props.projections.filter(item => item.dateKey === key)
            return (
              <Box
                key={key}
                role="cell"
                position="relative"
                minH={{ base: '66px', md: '132px' }}
                p={{ base: '5px 3px', md: '9px' }}
                _after={{
                  content: '""',
                  position: 'absolute',
                  inset: '0',
                  borderRightWidth: index % 7 === 6 ? '0' : '1px',
                  borderBottomWidth: index >= 35 ? '0' : '1px',
                  borderColor: 'calendar.border',
                  pointerEvents: 'none'
                }}
                bg={
                  key === today
                    ? 'action.950'
                    : outside
                      ? 'calendar.inset'
                      : 'calendar.surface'
                }
                overflow="hidden"
              >
                <Flex justify="flex-end">
                  <Flex
                    align="center"
                    justify="center"
                    w="25px"
                    h="25px"
                    borderRadius="full"
                    bg={key === today ? 'action.solid' : 'transparent'}
                    color={key === today ? 'white' : 'calendar.muted'}
                    fontSize="11px"
                    fontWeight="500"
                  >
                    {date.day}
                  </Flex>
                </Flex>
                {!outside && props.isNarrow && matches.length > 0 && (
                  <>
                    <HStack
                      justify="center"
                      gap="3px"
                      mt="4px"
                      aria-hidden="true"
                    >
                      {matches.slice(0, 3).map(item => (
                        <Box
                          key={item.key}
                          w="6px"
                          h="6px"
                          borderRadius="full"
                          bg={eventTone[item.tone].marker}
                        />
                      ))}
                    </HStack>
                    <Button
                      position="absolute"
                      inset="0"
                      w="100%"
                      h="100%"
                      p="0"
                      border="0"
                      bg="transparent"
                      aria-label={`${fullDate(key)}, ${matches.length} event${matches.length === 1 ? '' : 's'}. Show in List.`}
                      onClick={() => props.showDayInList(key)}
                      _focusVisible={{
                        outline: '2px solid',
                        outlineColor: 'calendar.focus',
                        outlineOffset: '-3px'
                      }}
                    />
                  </>
                )}
                {!outside && !props.isNarrow && (
                  <Stack gap="4px" mt="4px">
                    {matches.slice(0, limit).map(item => (
                      <EventTrigger
                        key={item.key}
                        projection={item}
                        variant="grid"
                        isNarrow={false}
                        selectedKey={props.selectedKey}
                        setSelectedKey={props.setSelectedKey}
                      />
                    ))}
                    {matches.length > limit && (
                      <OverflowPopover
                        projections={matches.slice(limit)}
                        day={key}
                      />
                    )}
                  </Stack>
                )}
              </Box>
            )
          })}
        </Grid>
      ))}
    </Box>
  )
}

type CalendarListProps = {
  projections: EventProjection[]
  todayKey: string | null
  isNarrow: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
}

export function CalendarList(props: CalendarListProps) {
  const groups = useMemo(() => {
    const result = new Map<string, EventProjection[]>()
    for (const item of props.projections)
      result.set(item.dateKey, [...(result.get(item.dateKey) ?? []), item])
    return result
  }, [props.projections])
  const days = [...groups].sort(([left], [right]) => left.localeCompare(right))
  const firstOnOrAfter = props.todayKey
    ? days.findIndex(([day]) => day >= props.todayKey!)
    : -1
  const todayBoundary = props.todayKey
    ? firstOnOrAfter === -1
      ? days.length
      : firstOnOrAfter
    : null
  return (
    <Stack
      w="min(900px, calc(100% - 28px))"
      mx="auto"
      gap="calendar.dateBoundary"
      py="calendar.dateBoundary"
    >
      {props.todayKey && todayBoundary === 0 && (
        <ListBoundary dateKey={props.todayKey} />
      )}
      {days.map(([day, events], index) => (
        <Fragment key={day}>
          <ListDay
            day={day}
            events={events}
            isNarrow={props.isNarrow}
            selectedKey={props.selectedKey}
            setSelectedKey={props.setSelectedKey}
          />
          {(index + 1 < days.length || todayBoundary === index + 1) && (
            <ListBoundary
              dateKey={todayBoundary === index + 1 ? props.todayKey : null}
            />
          )}
        </Fragment>
      ))}
    </Stack>
  )
}

// A date owns its event disclosures and their spacing. Callers supply domain
// data and selection, never per-row borders, margins, or responsive behavior.
function ListDay(
  props: Omit<CalendarListProps, 'projections' | 'todayKey'> & {
    day: string
    events: EventProjection[]
  }
) {
  return (
    <Grid
      id={`calendar-list-day-${props.day}`}
      role="group"
      aria-label={fullDate(props.day)}
      gridTemplateColumns={{
        base: '48px minmax(0,1fr)',
        md: '72px minmax(0,1fr)'
      }}
      gap={{ base: '2.5', md: '4.5' }}
    >
      <Box pt="3px">
        <Text
          color="calendar.subtle"
          fontSize="11px"
          fontWeight="500"
          textTransform="uppercase"
        >
          {shortWeekday(props.day)}
        </Text>
        <Text
          mt="1px"
          color="calendar.text"
          fontSize="24px"
          fontWeight="500"
          lineHeight="1"
        >
          {Number(props.day.slice(-2))}
        </Text>
      </Box>
      <Stack gap="calendar.eventStack">
        {props.events.map(item => (
          <EventTrigger
            key={item.key}
            projection={item}
            variant="list"
            isNarrow={props.isNarrow}
            selectedKey={props.selectedKey}
            setSelectedKey={props.setSelectedKey}
          />
        ))}
      </Stack>
    </Grid>
  )
}

function ListBoundary(props: { dateKey: string | null }) {
  if (!props.dateKey)
    return <Box h="1px" bg="calendar.border" aria-hidden="true" />
  return (
    <Flex
      id="calendar-today-divider"
      tabIndex={-1}
      aria-label={`Today, ${fullDate(props.dateKey)}`}
      align="center"
      gap="2"
      position="relative"
      zIndex="1"
      scrollMarginTop="18px"
      _focusVisible={focusRing}
    >
      <Box flex="1" h="1px" bg="calendar.border" aria-hidden="true" />
      <Text
        color="calendar.link"
        fontSize="xs"
        fontWeight="500"
        lineHeight="short"
        whiteSpace="nowrap"
      >
        Today · {shortWeekday(props.dateKey)}, {shortDate(props.dateKey)}
      </Text>
      <Box flex="1" h="1px" bg="calendar.border" aria-hidden="true" />
    </Flex>
  )
}

export function LoadState(props: {
  pending: boolean
  error: Error | null
  emptyMessage?: string
  retry: () => void
  children: ReactNode
}) {
  if (props.emptyMessage)
    return (
      <Text py="64px" px="18px" color="calendar.muted" textAlign="center">
        {props.emptyMessage}
      </Text>
    )
  if (props.pending)
    return (
      <Flex minH="360px" align="center" justify="center" gap="10px">
        <Spinner size="sm" color="calendar.focus" />
        <Text color="calendar.muted">Loading calendar…</Text>
      </Flex>
    )
  if (props.error)
    return (
      <Stack minH="360px" align="center" justify="center" gap="12px" px="18px">
        <Text color="calendar.danger" textAlign="center">
          Couldn’t load this calendar. {props.error.message}
        </Text>
        <Button {...controlProps} onClick={props.retry}>
          <RefreshCw size={15} /> Retry
        </Button>
      </Stack>
    )
  return props.children
}

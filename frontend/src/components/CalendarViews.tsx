import { useMemo, type ReactNode } from 'react'
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
  currentMonth,
  dateKey,
  fullDate,
  monthGrid,
  monthLabel,
  shortWeekday,
  type EventProjection
} from '../calendar'
import { controlProps, eventTone } from '../theme'
import { EventTrigger } from './EventDetails'
import { OverflowPopover } from './OverflowPopover'

function dateKeyFromToday(): string {
  const [year, month] = currentMonth().split('-')
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    day: '2-digit'
  }).format(new Date())
  return `${year}-${month}-${day}`
}

export function CalendarGrid(props: {
  month: string
  projections: EventProjection[]
  isNarrow: boolean
  compact: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  showDayInList: (day: string) => void
}) {
  const today = currentMonth() === props.month ? dateKeyFromToday() : ''
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

export function CalendarList(props: {
  projections: EventProjection[]
  isNarrow: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
}) {
  const groups = useMemo(() => {
    const result = new Map<string, EventProjection[]>()
    for (const item of props.projections)
      result.set(item.dateKey, [...(result.get(item.dateKey) ?? []), item])
    return result
  }, [props.projections])
  return (
    <Stack w="min(900px, calc(100% - 28px))" mx="auto" py="12px" gap="0">
      {[...groups].map(([day, events]) => (
        <Grid
          key={day}
          id={`calendar-list-day-${day}`}
          gridTemplateColumns={{
            base: '48px minmax(0,1fr)',
            md: '72px minmax(0,1fr)'
          }}
          gap={{ base: '10px', md: '18px' }}
          py="16px"
          borderBottomWidth="1px"
          borderColor="calendar.border"
        >
          <Box pt="3px">
            <Text
              color="calendar.subtle"
              fontSize="11px"
              fontWeight="500"
              textTransform="uppercase"
            >
              {shortWeekday(day)}
            </Text>
            <Text
              mt="1px"
              color="calendar.text"
              fontSize="24px"
              fontWeight="500"
              lineHeight="1"
            >
              {Number(day.slice(-2))}
            </Text>
          </Box>
          <Stack gap="7px">
            {events.map(item => (
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
      ))}
    </Stack>
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

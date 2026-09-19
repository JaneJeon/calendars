import {
  Box,
  Button,
  Checkbox,
  Collapsible,
  Flex,
  HStack,
  Menu,
  Portal,
  Spinner,
  Text
} from '@chakra-ui/react'
import { Check, ChevronDown, Filter } from 'lucide-react'
import {
  codexResetTypes,
  type CodexResetType,
  type DtsmFilterOption,
  type DtsmFilterOptionsResponse
} from '@janejeon/calendars-shared'
import type { FeedId } from '../calendar'
import { resetLabels } from '../content'
import {
  selectionSummary,
  sortFilterOptions,
  toggleId,
  type ExplorerState,
  type IdSelection
} from '../filters'
import {
  controlProps,
  focusRing,
  menuContentProps,
  menuItemProps
} from '../theme'

export type DtsmFilterKey = 'venueIds' | 'organizerIds' | 'categoryIds'

function EntityFilterMenu(props: {
  label: string
  noun: string
  selection: IdSelection
  options: DtsmFilterOption[]
  isDefaultPlaces?: boolean
  onChange: (selection: IdSelection) => void
}) {
  const orderedOptions = sortFilterOptions(props.options)
  const allIds = orderedOptions.map(option => option.id)
  const summary = selectionSummary(
    props.selection,
    props.options,
    props.noun,
    props.isDefaultPlaces
  )
  return (
    <Menu.Root
      closeOnSelect={false}
      positioning={{ placement: 'bottom-start' }}
    >
      <Menu.Trigger asChild>
        <Button
          {...controlProps}
          minW={{ base: '0', md: '190px' }}
          w={{ base: '100%', md: 'auto' }}
          justifyContent="space-between"
          aria-label={`${props.label}: ${summary}`}
        >
          <Text truncate>{summary}</Text>
          <ChevronDown size={15} color="#AEBAC8" aria-hidden="true" />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            {...menuContentProps}
            minW="260px"
            maxW="min(390px, calc(100vw - 28px))"
            maxH="min(430px, var(--available-height))"
            overflowY="auto"
          >
            <Menu.CheckboxItem
              value="all"
              checked={props.selection === null}
              onCheckedChange={checked => props.onChange(checked ? null : [])}
              {...menuItemProps}
            >
              <Text flex="1">All {props.noun}</Text>
              <Menu.ItemIndicator color="calendar.focus">
                <Check size={15} />
              </Menu.ItemIndicator>
            </Menu.CheckboxItem>
            <Menu.Separator borderColor="calendar.border" />
            {orderedOptions.map(option => (
              <Menu.CheckboxItem
                key={option.id}
                value={String(option.id)}
                valueText={option.name}
                checked={
                  props.selection === null ||
                  props.selection.includes(option.id)
                }
                onCheckedChange={checked =>
                  props.onChange(
                    toggleId(props.selection, option.id, checked, allIds)
                  )
                }
                {...menuItemProps}
              >
                <Text flex="1">{option.name}</Text>
                <Menu.ItemIndicator color="calendar.focus">
                  <Check size={15} />
                </Menu.ItemIndicator>
              </Menu.CheckboxItem>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function FilterCheckbox(props: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox.Root
      checked={props.checked}
      onCheckedChange={({ checked }) => props.onChange(Boolean(checked))}
      minH="44px"
      px="10px"
      borderWidth="1px"
      borderColor="calendar.controlBorder"
      borderRadius="9px"
      bg={props.checked ? 'action.subtle' : 'calendar.inset'}
      color="calendar.text"
      fontSize="13px"
      _hover={{ bg: props.checked ? 'action.emphasized' : 'calendar.raised' }}
      _focusVisible={focusRing}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control colorPalette="action">
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Label>{props.label}</Checkbox.Label>
    </Checkbox.Root>
  )
}

function FilterControls(props: {
  feed: FeedId
  filters: ExplorerState['filters']
  options?: DtsmFilterOptionsResponse
  optionsPending: boolean
  onOptionsRetry: () => void
  onDtsmChange: (key: DtsmFilterKey, value: IdSelection) => void
  onResetChange: (type: CodexResetType, checked: boolean) => void
}) {
  if (props.feed === 'codex')
    return (
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="8px"
      >
        <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
          Reset type
        </Text>
        <Flex wrap="wrap" gap="8px">
          {codexResetTypes.map(type => (
            <FilterCheckbox
              key={type}
              checked={props.filters.codex.types.includes(type)}
              label={resetLabels[type]}
              onChange={checked => props.onResetChange(type, checked)}
            />
          ))}
        </Flex>
      </Flex>
    )

  return (
    <Flex
      align={{ base: 'stretch', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      gap="12px"
      w="100%"
    >
      {props.options ? (
        <>
          {(
            [
              [
                'Places',
                'places',
                'venueIds',
                props.filters.dtsm.venueIds,
                props.options.venues,
                true
              ],
              [
                'Type',
                'types',
                'categoryIds',
                props.filters.dtsm.categoryIds,
                props.options.categories,
                false
              ],
              [
                'Host',
                'hosts',
                'organizerIds',
                props.filters.dtsm.organizerIds,
                props.options.organizers,
                false
              ]
            ] as const
          ).map(([label, noun, key, selection, values, isDefaultPlaces]) => (
            <Flex
              key={key}
              align={{ base: 'stretch', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              gap="8px"
            >
              <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
                {label}
              </Text>
              <EntityFilterMenu
                label={label}
                noun={noun}
                selection={selection}
                options={values}
                isDefaultPlaces={isDefaultPlaces}
                onChange={value => props.onDtsmChange(key, value)}
              />
            </Flex>
          ))}
        </>
      ) : props.optionsPending ? (
        <HStack color="calendar.muted">
          <Spinner size="xs" /> <Text fontSize="13px">Loading filters…</Text>
        </HStack>
      ) : (
        <HStack justify="space-between" w="100%" gap="12px">
          <Text color="calendar.danger" fontSize="13px">
            Filters are unavailable. The saved calendar can still load.
          </Text>
          <Button {...controlProps} onClick={props.onOptionsRetry}>
            Retry
          </Button>
        </HStack>
      )}
    </Flex>
  )
}

export function ExplorerFilters(props: {
  feed: FeedId
  filters: ExplorerState['filters']
  isNarrow: boolean
  open: boolean
  activeFilters: number
  options?: DtsmFilterOptionsResponse
  optionsPending: boolean
  onOpenChange: (open: boolean) => void
  onOptionsRetry: () => void
  onDtsmChange: (key: DtsmFilterKey, value: IdSelection) => void
  onResetChange: (type: CodexResetType, checked: boolean) => void
}) {
  const controls = (
    <FilterControls
      feed={props.feed}
      filters={props.filters}
      options={props.options}
      optionsPending={props.optionsPending}
      onOptionsRetry={props.onOptionsRetry}
      onDtsmChange={props.onDtsmChange}
      onResetChange={props.onResetChange}
    />
  )

  if (!props.isNarrow)
    return (
      <Box
        as="section"
        aria-label={props.feed === 'dtsm' ? 'Event filters' : 'Reset filters'}
        minH="64px"
        p="11px 14px"
        borderWidth="1px"
        borderColor="calendar.border"
        borderRadius="14px"
        bg="calendar.surface"
      >
        {controls}
      </Box>
    )

  return (
    <Collapsible.Root
      open={props.open}
      onOpenChange={({ open }) => props.onOpenChange(open)}
    >
      <Collapsible.Trigger asChild>
        <Button
          {...controlProps}
          w="100%"
          h="48px"
          px="13px"
          justifyContent="space-between"
        >
          <HStack gap="8px">
            <Filter size={16} color="#91B8FF" />
            <span>
              {props.feed === 'dtsm' ? 'Filter events' : 'Filter resets'}
            </span>
          </HStack>
          <Text color="calendar.muted" fontSize="11px">
            {props.activeFilters
              ? `${props.activeFilters} active`
              : props.feed === 'dtsm'
                ? 'Default events'
                : 'All resets'}
          </Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          mt="9px"
          p="13px"
          borderWidth="1px"
          borderColor="calendar.controlBorder"
          borderRadius="12px"
          bg="calendar.surface"
        >
          {controls}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

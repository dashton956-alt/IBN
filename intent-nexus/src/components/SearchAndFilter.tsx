
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchAndFilterProps {
  searchPlaceholder?: string;
  filterOptions: FilterOption[];
  onSearch: (query: string) => void;
  onFilter: (filters: Record<string, string>) => void;
  onClear: () => void;
}

export const SearchAndFilter = ({
  searchPlaceholder = "Search...",
  filterOptions,
  onSearch,
  onFilter,
  onClear
}: SearchAndFilterProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilter(newFilters);
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFilter(newFilters);
  };

  const clearAll = () => {
    setSearchQuery('');
    setActiveFilters({});
    onClear();
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200/70 h-4 w-4" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-white/20 text-white"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-200/70" />
          <span className="text-sm text-blue-200/70">Filters:</span>
        </div>
        
        {filterOptions.map((option) => (
          <Select
            key={option.key}
            value={activeFilters[option.key] || ''}
            onValueChange={(value) => handleFilter(option.key, value)}
          >
            <SelectTrigger className="w-[180px] bg-slate-800 border-white/20 text-white">
              <SelectValue placeholder={option.label} />
            </SelectTrigger>
            <SelectContent>
              {option.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {(searchQuery || Object.keys(activeFilters).length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="border-red-500 text-red-400 hover:bg-red-500/10"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            const option = filterOptions.find(opt => opt.key === key);
            const label = option?.options.find(opt => opt.value === value)?.label || value;
            return (
              <Badge
                key={key}
                variant="secondary"
                className="bg-blue-600/20 text-blue-300 border-blue-600/30"
              >
                {option?.label}: {label}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-red-400"
                  onClick={() => removeFilter(key)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

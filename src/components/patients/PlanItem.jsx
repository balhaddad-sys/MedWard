import { useState } from 'react';
import { 
  CheckCircle, Circle, Clock, AlertTriangle, User, Calendar,
  ChevronDown, ChevronUp, Plus, MoreVertical, Edit, Trash2,
  Flag, Star, Target, ClipboardList
} from 'lucide-react';
import { Badge } from '../ui';

// Plan item categories
const PLAN_CATEGORIES = {
  investigation: { name: 'Investigations', icon: ClipboardList, color: 'blue' },
  treatment: { name: 'Treatment', icon: Target, color: 'emerald' },
  monitoring: { name: 'Monitoring', icon: Clock, color: 'amber' },
  consultation: { name: 'Consultations', icon: User, color: 'purple' },
  discharge: { name: 'Discharge Planning', icon: Calendar, color: 'gray' },
  other: { name: 'Other', icon: Star, color: 'gray' },
};

// Priority styles
const PRIORITY_STYLES = {
  urgent: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    icon: 'text-rose-500',
    badge: 'danger',
  },
  high: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-500',
    badge: 'warning',
  },
  normal: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: 'text-gray-400',
    badge: 'default',
  },
  low: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-500 dark:text-gray-400',
    icon: 'text-gray-400',
    badge: 'default',
  },
};

// Status styles
const STATUS_STYLES = {
  pending: { icon: Circle, color: 'text-gray-400', label: 'Pending' },
  inProgress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'text-emerald-500', label: 'Completed' },
  cancelled: { icon: Circle, color: 'text-gray-300 line-through', label: 'Cancelled' },
  deferred: { icon: Clock, color: 'text-amber-500', label: 'Deferred' },
};

export function PlanItem({
  item,
  compact = false,
  showActions = true,
  onToggle,
  onEdit,
  onDelete,
  onClick,
}) {
  const {
    id,
    text,
    description,
    category = 'other',
    priority = 'normal',
    status = 'pending',
    assignedTo,
    dueDate,
    createdAt,
    completedAt,
    notes,
  } = item;
  
  const priorityStyle = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal;
  const statusConfig = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const categoryConfig = PLAN_CATEGORIES[category] || PLAN_CATEGORIES.other;
  const StatusIcon = statusConfig.icon;
  const CategoryIcon = categoryConfig.icon;
  
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted && !isCancelled;
  
  if (compact) {
    return (
      <div
        onClick={() => onClick?.(item)}
        className={`flex items-center gap-3 p-3 rounded-lg border ${priorityStyle.border} ${priorityStyle.bg} ${onClick ? 'cursor-pointer hover:shadow-sm' : ''} transition-all`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.(item);
          }}
          className="flex-shrink-0"
          disabled={!onToggle}
        >
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isCompleted || isCancelled ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {text}
          </p>
        </div>
        
        {priority === 'urgent' && (
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
        )}
        
        {isOverdue && (
          <Badge variant="danger" size="sm">Overdue</Badge>
        )}
      </div>
    );
  }
  
  return (
    <div className={`rounded-xl border ${priorityStyle.border} ${priorityStyle.bg} overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}>
      <div className="p-4" onClick={() => onClick?.(item)}>
        <div className="flex items-start gap-3">
          {/* Status checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(item);
            }}
            className="flex-shrink-0 mt-0.5"
            disabled={!onToggle}
          >
            <StatusIcon className={`w-6 h-6 ${statusConfig.color} ${onToggle ? 'hover:scale-110' : ''} transition-transform`} />
          </button>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {priority === 'urgent' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    URGENT
                  </span>
                )}
                {priority === 'high' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                    <Flag className="w-3 h-3" />
                    HIGH
                  </span>
                )}
                <Badge 
                  variant="info" 
                  size="sm"
                  className={`bg-${categoryConfig.color}-100 dark:bg-${categoryConfig.color}-900/30 text-${categoryConfig.color}-700 dark:text-${categoryConfig.color}-300`}
                >
                  <CategoryIcon className="w-3 h-3 mr-1" />
                  {categoryConfig.name}
                </Badge>
              </div>
              
              {showActions && (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <p className={`mt-2 font-medium ${isCompleted || isCancelled ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {text}
            </p>
            
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
            
            {/* Meta info */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {assignedTo && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {assignedTo}
                </span>
              )}
              
              {dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}`}>
                  <Calendar className="w-3 h-3" />
                  Due: {new Date(dueDate).toLocaleDateString()}
                  {isOverdue && ' (Overdue)'}
                </span>
              )}
              
              {completedAt && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3 h-3" />
                  Completed: {new Date(completedAt).toLocaleString()}
                </span>
              )}
              
              <Badge variant={statusConfig.color === 'text-emerald-500' ? 'success' : 'default'} size="sm">
                {statusConfig.label}
              </Badge>
            </div>
            
            {notes && (
              <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                {notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Plan list with grouping
export function PlanList({
  items = [],
  groupBy = 'category', // 'category', 'status', 'priority', 'none'
  showCompleted = true,
  showActions = true,
  compact = false,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onClick,
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  
  // Filter items
  const filtered = showCompleted 
    ? items 
    : items.filter(i => i.status !== 'completed' && i.status !== 'cancelled');
  
  // Group items
  const grouped = (() => {
    if (groupBy === 'none') return { all: filtered };
    
    const groups = {};
    filtered.forEach(item => {
      let key;
      switch (groupBy) {
        case 'category':
          key = item.category || 'other';
          break;
        case 'status':
          key = item.status || 'pending';
          break;
        case 'priority':
          key = item.priority || 'normal';
          break;
        default:
          key = 'all';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return groups;
  })();
  
  // Sort groups by priority
  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
    if (groupBy === 'priority') {
      const order = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (order[a] ?? 99) - (order[b] ?? 99);
    }
    if (groupBy === 'status') {
      const order = { pending: 0, inProgress: 1, deferred: 2, completed: 3, cancelled: 4 };
      return (order[a] ?? 99) - (order[b] ?? 99);
    }
    return 0;
  });
  
  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const isExpanded = (key) => expandedGroups[key] !== false;
  
  // Stats
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    inProgress: items.filter(i => i.status === 'inProgress').length,
    completed: items.filter(i => i.status === 'completed').length,
    urgent: items.filter(i => i.priority === 'urgent' && i.status !== 'completed').length,
  };
  
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">No plan items</p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Plan Item
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="info">{stats.total} Total</Badge>
          {stats.urgent > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {stats.urgent} Urgent
            </Badge>
          )}
          <Badge variant="warning">{stats.pending} Pending</Badge>
          {stats.inProgress > 0 && <Badge variant="info">{stats.inProgress} In Progress</Badge>}
          <Badge variant="success">{stats.completed} Done</Badge>
        </div>
        
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>
      
      {/* Grouped items */}
      {groupBy === 'none' ? (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {filtered.map((item, idx) => (
            <PlanItem
              key={item.id || idx}
              item={item}
              compact={compact}
              showActions={showActions}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroupKeys.map(groupKey => {
            const groupItems = grouped[groupKey];
            const config = groupBy === 'category' 
              ? PLAN_CATEGORIES[groupKey] 
              : groupBy === 'priority'
                ? { name: groupKey.charAt(0).toUpperCase() + groupKey.slice(1), icon: Flag }
                : { name: STATUS_STYLES[groupKey]?.label || groupKey, icon: Clock };
            
            const GroupIcon = config?.icon || ClipboardList;
            const expanded = isExpanded(groupKey);
            
            return (
              <div key={groupKey} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {config?.name || groupKey}
                    </span>
                    <Badge variant="info" size="sm">{groupItems.length}</Badge>
                  </div>
                  {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                
                {expanded && (
                  <div className={`p-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
                    {groupItems.map((item, idx) => (
                      <PlanItem
                        key={item.id || idx}
                        item={item}
                        compact={compact}
                        showActions={showActions}
                        onToggle={onToggle}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onClick={onClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Quick add plan item
export function QuickAddPlan({ onAdd, categories = Object.keys(PLAN_CATEGORIES) }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('normal');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    onAdd({
      text: text.trim(),
      category,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    
    setText('');
  };
  
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add new plan item..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
        />
        
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{PLAN_CATEGORIES[cat]?.name || cat}</option>
          ))}
        </select>
        
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export { PLAN_CATEGORIES, PRIORITY_STYLES, STATUS_STYLES };
